import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "https://xwmdotzhgerirsydgbnc.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bWRvdHpoZ2VyaXJzeWRnYm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc5MzIsImV4cCI6MjA4NzYyMzkzMn0.qFulksccdbSPx4marSQ3euFbfO1TqaosEO2rumwndjc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const app = express();
app.use(express.json());

// GLOBAL LOG
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Routes
app.get("/api/posts", async (req, res) => {
  const { data: posts, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(posts || []);
});

app.post("/api/posts", async (req, res) => {
  const { username, content } = req.body;
  const { data: newPost, error } = await supabase.from('posts').insert([{ username, content }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(newPost);
});

app.put("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  const { username, content } = req.body;
  const { data: updatedPost, error } = await supabase.from('posts').update({ content }).eq('id', id).eq('username', username).select().single();
  if (error) return res.status(404).json({ error: "Update failed" });
  res.json(updatedPost);
});

app.delete("/api/posts/:id", async (req, res) => {
  const { id } = req.params;
  const { username } = req.body;
  const { error } = await supabase.from('posts').delete().eq('id', id).eq('username', username);
  if (error) return res.status(404).json({ error: "Delete failed" });
  res.json({ success: true });
});

// Vite / Static Serving
async function setupFrontend() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "dist", "index.html")));
  }
}

setupFrontend();

if (process.env.NODE_ENV !== "production") {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
