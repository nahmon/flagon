-- Migration 008: Add push_token to users table for local notification delivery
alter table public.users add column if not exists push_token text;
