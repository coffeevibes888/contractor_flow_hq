import { requireAdmin } from '@/lib/auth-guard';
import BlogEditor from '@/components/admin/blog-editor';

const AdminCreateBlogPage = async () => {
  await requireAdmin();

  return (
    <div className="w-full min-h-screen">
      <div className="space-y-4 max-w-4xl">
        <header className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900">Create Blog Post</h1>
          <p className="text-slate-600 text-sm md:text-base">
            Share news, inspiration, and stories with your audience.
          </p>
        </header>

        <BlogEditor />
      </div>
    </div>
  );
};

export default AdminCreateBlogPage;
