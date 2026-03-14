import React, { useState, useEffect } from 'react';
import { 
  Send, 
  User, 
  LogOut, 
  MessageSquare, 
  Lock, 
  UserPlus, 
  LogIn, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  Heart,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "https://xwmdotzhgerirsydgbnc.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bWRvdHpoZ2VyaXJzeWRnYm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc5MzIsImV4cCI6MjA4NzYyMzkzMn0.qFulksccdbSPx4marSQ3euFbfO1TqaosEO2rumwndjc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Post {
  id: number;
  user_id: string;
  email: string;
  content: string;
  created_at: string;
  likes_count?: number;
  user_has_liked?: boolean;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  user_email?: string;
  replies?: Comment[];
}

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(localStorage.getItem('textpost_user_email'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('textpost_user_id'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    // Check connection to backend
    fetch('/api/health')
      .then(res => res.ok ? setDbStatus('connected') : setDbStatus('error'))
      .catch(() => setDbStatus('error'));
    
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email!);
        setUserId(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email!);
        setUserId(session.user.id);
        localStorage.setItem('textpost_user_email', session.user.email!);
        localStorage.setItem('textpost_user_id', session.user.id);
      } else {
        setUserEmail(null);
        setUserId(null);
        localStorage.removeItem('textpost_user_email');
        localStorage.removeItem('textpost_user_id');
      }
    });

    // Listen for OAuth success message from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUserEmail(session.user.email!);
            setUserId(session.user.id);
          }
        });
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    if (userEmail) {
      fetchPosts();
    }
  }, [userEmail]);

  const fetchPosts = async () => {
    try {
      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (postsError) throw postsError;

      // Fetch likes for these posts
      const { data: likesData } = await supabase
        .from('likes')
        .select('post_id, user_id');

      const processedPosts = (postsData || []).map(post => {
        const postLikes = (likesData || []).filter(l => l.post_id === post.id);
        return {
          ...post,
          likes_count: postLikes.length,
          user_has_liked: userId ? postLikes.some(l => l.user_id === userId) : false
        };
      });

      setPosts(processedPosts);
    } catch (error: any) {
      console.error('Failed to fetch posts:', error);
      setError(`Fetch error: ${error.message}`);
    }
  };

  const fetchComments = async (postId: number) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users (email)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedComments = (data || []).map(c => ({
        ...c,
        user_email: (c.users as any)?.email || 'Unknown'
      }));

      setComments(prev => ({ ...prev, [postId]: formattedComments }));
    } catch (error: any) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleToggleLike = async (postId: number, hasLiked: boolean) => {
    if (!userId) return;
    try {
      if (hasLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
      } else {
        await supabase.from('likes').insert([{ post_id: postId, user_id: userId }]);
      }
      fetchPosts();
    } catch (error) {
      console.error('Like error:', error);
    }
  };

  const handleAddComment = async (postId: number, parentId: number | null = null) => {
    if (!newCommentContent.trim() || !userId) return;
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: userId,
          parent_id: parentId,
          content: newCommentContent.trim()
        }]);

      if (error) throw error;
      setNewCommentContent('');
      setReplyingToId(null);
      fetchComments(postId);
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, 'supabase_oauth', 'width=600,height=700');
      }
    } catch (err: any) {
      setError(err.message || 'Google login failed');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: loginEmail,
          password: loginPassword,
        });
        
        if (error) throw error;
        
        if (data.user && data.session) {
          localStorage.setItem('textpost_user_email', data.user.email!);
          localStorage.setItem('textpost_user_id', data.user.id);
          setUserEmail(data.user.email!);
          setUserId(data.user.id);
        } else {
          setError('Check your email for a confirmation link!');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });
        
        if (error) throw error;
        
        if (data.user) {
          localStorage.setItem('textpost_user_email', data.user.email!);
          localStorage.setItem('textpost_user_id', data.user.id);
          setUserEmail(data.user.email!);
          setUserId(data.user.id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('textpost_user_email');
    localStorage.removeItem('textpost_user_id');
    setUserEmail(null);
    setUserId(null);
    setLoginEmail('');
    setLoginPassword('');
    setError(null);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !userId) return;

    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{ 
          user_id: userId, 
          email: userEmail, 
          content: newPostContent.trim() 
        }])
        .select()
        .single();
      
      if (error) throw error;

      setNewPostContent('');
      fetchPosts();
    } catch (error: any) {
      console.error('Post error:', error);
      setError(`Database error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (postId: number) => {
    if (!editContent.trim() || !userId) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', postId)
        .eq('user_id', userId);

      if (error) throw error;

      setEditingPostId(null);
      fetchPosts();
    } catch (err: any) {
      console.error('Edit error:', err);
      setError(`Update failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!userId || !window.confirm('Are you sure you want to delete this post?')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', userId);

      if (error) throw error;
      fetchPosts();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(`Delete failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-black rounded-3xl p-8 border border-zinc-800"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="text-black w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">TextPost</h1>
            <p className="text-zinc-500 text-sm mt-2">
              {isRegistering ? 'Create a new account' : 'Log in to your account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-4 rounded-xl text-sm font-medium ${error.includes('successful') || error.includes('Check your email') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {error}
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-zinc-700 transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-black py-4 rounded-full font-bold hover:bg-zinc-200 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'Register' : 'Login'}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-black text-zinc-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-black border border-zinc-800 text-white py-4 rounded-full font-bold hover:bg-zinc-900 transition-colors active:scale-[0.98] flex items-center justify-center gap-3"
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
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm text-zinc-500 hover:text-white transition-colors"
            >
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans pb-20 text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <MessageSquare className="text-black w-4 h-4" />
              </div>
              <span className="font-bold text-xl tracking-tight">TextPost</span>
              <div className={`ml-2 w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} title={dbStatus === 'connected' ? 'Server Connected' : 'Server Connection Error'} />
            </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
              <User className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-300">{userEmail}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-500 hover:text-white transition-colors"
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
              className="mb-4 p-4 bg-red-500/10 text-red-400 rounded-xl text-sm border border-red-500/20 flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400/50 hover:text-red-400 transition-colors">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post Form */}
        <div className="bg-black border-b border-zinc-800 p-6 mb-4">
          <form onSubmit={handlePost}>
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-zinc-500" />
              </div>
              <div className="flex-1">
                <textarea
                  placeholder="What's happening?!"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full min-h-[100px] py-2 bg-transparent text-xl text-white placeholder-zinc-500 focus:outline-none transition-all resize-none"
                  required
                />
                <div className="flex justify-end pt-4 border-t border-zinc-900">
                  <button
                    type="submit"
                    disabled={isLoading || !newPostContent.trim()}
                    className="flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                  >
                    {isLoading ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div className="divide-y divide-zinc-800">
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 hover:bg-zinc-900/30 transition-colors cursor-pointer"
              >
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-white truncate">{post.email.split('@')[0]}</span>
                        <span className="text-zinc-500 text-sm truncate">@{post.email.split('@')[0]}</span>
                        <span className="text-zinc-500 text-sm">·</span>
                        <span className="text-zinc-500 text-sm whitespace-nowrap">
                          {new Date(post.created_at).toLocaleString([], { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      {userId === post.user_id && (
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPostId(post.id);
                              setEditContent(post.content);
                            }}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(post.id);
                            }}
                            className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {editingPostId === post.id ? (
                      <div className="space-y-3 mt-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/10 transition-all resize-none"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingPostId(null)}
                            className="px-4 py-1.5 text-sm font-bold text-zinc-500 hover:text-white transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleEdit(post.id)}
                            disabled={isLoading || !editContent.trim()}
                            className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap text-[15px]">
                          {post.content}
                        </p>
                        
                        <div className="flex items-center justify-between max-w-md pt-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleLike(post.id, !!post.user_has_liked);
                            }}
                            className={`flex items-center gap-2 text-sm transition-colors group ${post.user_has_liked ? 'text-pink-500' : 'text-zinc-500 hover:text-pink-500'}`}
                          >
                            <div className={`p-2 rounded-full group-hover:bg-pink-500/10 transition-colors`}>
                              <Heart className={`w-4 h-4 ${post.user_has_liked ? 'fill-current' : ''}`} />
                            </div>
                            <span className="font-medium">{post.likes_count || 0}</span>
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (activeCommentPostId === post.id) {
                                setActiveCommentPostId(null);
                              } else {
                                setActiveCommentPostId(post.id);
                                fetchComments(post.id);
                              }
                            }}
                            className="flex items-center gap-2 text-sm transition-colors group text-zinc-500 hover:text-sky-500"
                          >
                            <div className="p-2 rounded-full group-hover:bg-sky-500/10 transition-colors">
                              <MessageSquare className="w-4 h-4" />
                            </div>
                            <span className="font-medium">Comment</span>
                          </button>

                          <button className="p-2 text-zinc-500 hover:text-sky-500 hover:bg-sky-500/10 rounded-full transition-colors">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Comments Section */}
                        <AnimatePresence>
                          {activeCommentPostId === post.id && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-4 pt-4 overflow-hidden"
                            >
                              <div className="flex gap-3">
                                <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                                  <User className="w-4 h-4 text-zinc-500" />
                                </div>
                                <div className="flex-1 flex gap-2">
                                  <input 
                                    type="text"
                                    placeholder="Post your reply"
                                    value={newCommentContent}
                                    onChange={(e) => setNewCommentContent(e.target.value)}
                                    className="flex-1 bg-transparent border-b border-zinc-800 py-1 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                  />
                                  <button 
                                    onClick={() => handleAddComment(post.id)}
                                    disabled={!newCommentContent.trim()}
                                    className="bg-sky-500 text-white px-4 py-1 rounded-full text-sm font-bold hover:bg-sky-600 disabled:opacity-50"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-6 ml-11">
                                {(comments[post.id] || [])
                                  .filter(c => !c.parent_id)
                                  .map(comment => (
                                    <div key={comment.id} className="space-y-2">
                                      <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                                          <User className="w-4 h-4 text-zinc-500" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-white">{comment.user_email.split('@')[0]}</span>
                                            <span className="text-zinc-500 text-xs">· {new Date(comment.created_at).toLocaleDateString()}</span>
                                          </div>
                                          <p className="text-[15px] text-zinc-200">{comment.content}</p>
                                          <button 
                                            onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                                            className="text-xs font-bold text-zinc-500 hover:text-sky-500 mt-2"
                                          >
                                            Reply
                                          </button>
                                        </div>
                                      </div>

                                      {/* Replies */}
                                      <div className="ml-11 space-y-4">
                                        {(comments[post.id] || [])
                                          .filter(r => r.parent_id === comment.id)
                                          .map(reply => (
                                            <div key={reply.id} className="flex gap-3">
                                              <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center shrink-0">
                                                <User className="w-3 h-3 text-zinc-500" />
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                  <span className="text-sm font-bold text-white">{reply.user_email.split('@')[0]}</span>
                                                </div>
                                                <p className="text-sm text-zinc-300">{reply.content}</p>
                                              </div>
                                            </div>
                                          ))}
                                        
                                        {replyingToId === comment.id && (
                                          <div className="flex gap-2 pt-2">
                                            <input 
                                              autoFocus
                                              type="text"
                                              placeholder="Post your reply"
                                              value={newCommentContent}
                                              onChange={(e) => setNewCommentContent(e.target.value)}
                                              className="flex-1 bg-transparent border-b border-zinc-800 py-1 text-sm text-white focus:outline-none focus:border-sky-500"
                                            />
                                            <button 
                                              onClick={() => handleAddComment(post.id, comment.id)}
                                              disabled={!newCommentContent.trim()}
                                              className="bg-sky-500 text-white px-3 py-1 rounded-full text-xs font-bold"
                                            >
                                              Reply
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-zinc-600 font-medium">No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
