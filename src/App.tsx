import React, { useState, useEffect } from 'react';
import { Send, User, LogOut, MessageSquare, Lock, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Post {
  id: number;
  username: string;
  content: string;
  created_at: string;
}

export default function App() {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('textpost_user'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const userEmail = session.user.email || 'Google User';
        localStorage.setItem('textpost_user', userEmail);
        setUsername(userEmail);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userEmail = session.user.email || 'Google User';
        localStorage.setItem('textpost_user', userEmail);
        setUsername(userEmail);
      } else {
        localStorage.removeItem('textpost_user');
        setUsername(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (username) {
      fetchPosts();
    }
  }, [username]);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (isRegistering) {
          setIsRegistering(false);
          setError('Registration successful! Please log in.');
        } else {
          localStorage.setItem('textpost_user', data.username);
          setUsername(data.username);
        }
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Something went wrong');
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) setError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('textpost_user');
    setUsername(null);
    setLoginUsername('');
    setLoginPassword('');
    setError(null);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !username) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: newPostContent.trim() }),
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (response.ok) {
          setNewPostContent('');
          fetchPosts();
        } else {
          setError(data.error || `Error ${response.status}: Failed to post`);
        }
      } else {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        setError(`Server Error ${response.status}. Please check logs.`);
      }
    } catch (error: any) {
      console.error('Failed to post:', error);
      setError(`Connection error: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!username) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 border border-black/5"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">TextPost</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {isRegistering ? 'Create a new account' : 'Log in to your account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-3 rounded-xl text-sm ${error.includes('successful') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-2xl font-medium hover:bg-zinc-800 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'Register' : 'Login'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-zinc-500 uppercase tracking-wider text-xs font-semibold">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-zinc-200 text-zinc-700 py-4 rounded-2xl font-medium hover:bg-zinc-50 transition-colors active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm text-zinc-500 hover:text-black transition-colors"
            >
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <MessageSquare className="text-white w-4 h-4" />
            </div>
            <span className="font-semibold text-zinc-900">TextPost</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full">
              <User className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700">{username}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post Form */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-black/5 mb-8">
          <form onSubmit={handlePost}>
            <textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full min-h-[120px] p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none mb-4"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !newPostContent.trim()}
                className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? 'Posting...' : (
                  <>
                    <span>Post</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                    <span className="font-semibold text-zinc-900">{post.username}</span>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-zinc-400">No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
