-- Dignity Leads CRM - Database Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

-- 1. Events (活动展会)
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Projects (楼盘项目)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  selling_points JSONB DEFAULT '[]',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Leads (客户)
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  project_interest TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'viewing', 'closed', 'dead')),
  follow_up_done JSONB DEFAULT '{"day0": false, "day1": false, "day3": false, "day7": false}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Timeline (互动时间线)
CREATE TABLE IF NOT EXISTS timeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('note', 'status_change', 'whatsapp', 'call', 'system')),
  content TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Templates (消息模板)
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  day_type TEXT NOT NULL CHECK (day_type IN ('day0', 'day1', 'day3', 'day7', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_event_id ON leads(event_id);
CREATE INDEX IF NOT EXISTS idx_leads_project_id ON leads(project_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_timeline_lead_id ON timeline(lead_id);
CREATE INDEX IF NOT EXISTS idx_templates_project_id ON templates(project_id);

-- Auto-update updated_at on leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security (open for now, single user)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Allow all operations (single user, no auth yet)
CREATE POLICY "Allow all on events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on leads" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on timeline" ON timeline FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on templates" ON templates FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for leads (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE leads;

-- ─── Storage ───
-- Create a public bucket for project images
-- Run this in SQL Editor or create manually in Dashboard → Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to project images
CREATE POLICY "Public read access on project-images" ON storage.objects
  FOR SELECT USING (bucket_id = 'project-images');

-- Allow uploads to project images
CREATE POLICY "Allow uploads to project-images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'project-images');

-- Allow deletes on project images
CREATE POLICY "Allow deletes on project-images" ON storage.objects
  FOR DELETE USING (bucket_id = 'project-images');
