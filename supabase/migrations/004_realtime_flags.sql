-- Enable Realtime on flags table for live leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.flags;
