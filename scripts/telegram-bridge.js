#!/usr/bin/env node
/**
 * FlagOn Telegram Bridge
 *
 * Telegram 메시지를 받아 Claude Code CLI로 작업을 실행하고 결과를 반환합니다.
 *
 * 실행: node scripts/telegram-bridge.js
 * 환경변수 (선택):
 *   TELEGRAM_BOT_TOKEN  - 봇 토큰 (기본값: 워크플로에서 사용 중인 토큰)
 *   TELEGRAM_CHAT_ID    - 허용할 chat ID
 *   GITHUB_TOKEN        - 이슈 생성 시 필요
 *   PROJECT_DIR         - 프로젝트 경로 (기본값: 이 파일의 상위 디렉토리)
 */

const https = require('https');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8752731720:AAHtL3nXN05lzeEu92qn4-UDD6QdX9aAzj8';
const ALLOWED_CHAT = process.env.TELEGRAM_CHAT_ID || '7169756842';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'nahmon/flagon';
const PROJECT_DIR = process.env.PROJECT_DIR || path.resolve(__dirname, '..');
const CLAUDE_BIN = '/opt/homebrew/bin/claude';

let lastUpdateId = 0;
let isRunningTask = false;

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function httpsPost(hostname, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    const req = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        ...headers,
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(data); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Telegram API ──────────────────────────────────────────────────────────────

function getUpdates() {
  return httpsGet(
    `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`
  );
}

function sendMessage(chatId, text) {
  const truncated = text.length > 4000 ? text.slice(0, 3900) + '\n\n…(잘림)' : text;
  return httpsPost('api.telegram.org', `/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: chatId,
    text: truncated,
    parse_mode: 'HTML',
  });
}

// ── GitHub API ────────────────────────────────────────────────────────────────

function createIssue(title, body) {
  if (!GITHUB_TOKEN) return Promise.reject(new Error('GITHUB_TOKEN 미설정'));
  return httpsPost(
    'api.github.com',
    `/repos/${REPO}/issues`,
    { title, body, labels: ['claude-task'] },
    {
      Authorization: `token ${GITHUB_TOKEN}`,
      'User-Agent': 'FlagOn-TelegramBridge/1.0',
    }
  );
}

// ── Claude CLI runner ─────────────────────────────────────────────────────────

function runClaude(prompt) {
  return new Promise((resolve) => {
    const chunks = [];
    const child = spawn(CLAUDE_BIN, ['-p', prompt, '--no-ansi'], {
      cwd: PROJECT_DIR,
      env: { ...process.env, FORCE_COLOR: '0' },
      timeout: 120_000,
    });
    child.stdout.on('data', d => chunks.push(d.toString()));
    child.stderr.on('data', d => chunks.push('[stderr] ' + d.toString()));
    child.on('close', () => resolve(chunks.join('')));
    child.on('error', e => resolve('실행 오류: ' + e.message));
  });
}

// ── Command handlers ──────────────────────────────────────────────────────────

const HELP_TEXT =
  '🚩 <b>FlagOn Claude Bridge</b>\n\n' +
  '명령어:\n' +
  '<code>/claude [프롬프트]</code> — Claude Code 실행\n' +
  '<code>/issue [제목]</code> — GitHub 이슈 생성\n' +
  '<code>/status</code> — 최근 커밋 5개\n' +
  '<code>/help</code> — 이 메시지\n\n' +
  '일반 텍스트 → Claude에게 바로 질문합니다';

async function handleCommand(chatId, text) {
  const cmd = text.trim();

  if (cmd === '/help' || cmd === '/start') {
    return sendMessage(chatId, HELP_TEXT);
  }

  if (cmd === '/status') {
    try {
      const log = execSync('git log --oneline -5', { cwd: PROJECT_DIR }).toString().trim();
      return sendMessage(chatId, `📝 <b>최근 커밋</b>\n\n<code>${log}</code>`);
    } catch (e) {
      return sendMessage(chatId, '❌ git log 실패: ' + e.message);
    }
  }

  if (cmd.startsWith('/issue ')) {
    const title = cmd.slice(7).trim();
    if (!title) return sendMessage(chatId, '사용법: /issue [이슈 제목]');
    try {
      await sendMessage(chatId, '📋 이슈 생성 중…');
      const issue = await createIssue(title, `> Telegram에서 요청됨\n\n${title}`);
      return sendMessage(chatId, `✅ 이슈 생성됨: <b>#${issue.number}</b>\n${issue.html_url}`);
    } catch (e) {
      return sendMessage(chatId, '❌ 이슈 생성 실패: ' + e.message);
    }
  }

  // /claude <prompt> or plain text → run Claude
  if (isRunningTask) {
    return sendMessage(chatId, '⏳ 이미 작업 중입니다. 잠시 후 다시 시도하세요.');
  }

  const prompt = cmd.startsWith('/claude ') ? cmd.slice(8).trim() : cmd;
  if (!prompt) return sendMessage(chatId, HELP_TEXT);

  isRunningTask = true;
  await sendMessage(chatId, `🤖 <b>Claude 실행 중…</b>\n\n<i>${prompt.slice(0, 100)}</i>`);

  try {
    const result = await runClaude(prompt);
    await sendMessage(chatId, `✅ <b>완료</b>\n\n${result || '(출력 없음)'}`);
  } catch (e) {
    await sendMessage(chatId, '❌ 오류: ' + e.message);
  } finally {
    isRunningTask = false;
  }
}

// ── Main polling loop ─────────────────────────────────────────────────────────

async function poll() {
  console.log(`🚩 FlagOn Telegram Bridge 시작 (프로젝트: ${PROJECT_DIR})`);
  await sendMessage(ALLOWED_CHAT, '🚩 FlagOn Bridge 활성화됨\n/help 로 명령어 확인');

  while (true) {
    try {
      const { result = [] } = await getUpdates();
      for (const update of result) {
        lastUpdateId = Math.max(lastUpdateId, update.update_id);
        const msg = update.message;
        if (!msg?.text) continue;
        const chatId = String(msg.chat.id);
        if (chatId !== ALLOWED_CHAT) {
          console.log(`무시됨 (chat ${chatId}): ${msg.text}`);
          continue;
        }
        console.log(`📩 ${msg.text}`);
        handleCommand(chatId, msg.text).catch(e => console.error('handler error:', e));
      }
    } catch (e) {
      console.error('poll error:', e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

poll();
