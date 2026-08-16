'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { insertBlogPostSchema } from '@/lib/validators';
import { createBlogPost } from '@/lib/actions/blog.actions';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UploadButton } from '@/lib/uploadthing';
import {
  Bold,
  Italic,
  Underline,
  Palette,
  SmilePlus,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Type,
  Save,
} from 'lucide-react';

const emojiList = ['😀','😁','😂','🤣','😊','😍','😎','🤩','🙏','🎉','🔥','❤️','💯'];

const blogDefaultValues: z.infer<typeof insertBlogPostSchema> = {
  title: '',
  slug: '',
  excerpt: '',
  contentHtml: '',
  coverImage: null,
  mediaUrls: [],
  tags: [],
  isPublished: true,
  authorId: null,
};

/**
 * Convert "Some Title!" → "some-title". Matches the slug regex used by
 * ContractorProfile (lowercase, alphanumeric + dashes only).
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BlogEditor() {
  const router = useRouter();
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const slugTouchedRef = useRef(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [tagsInput, setTagsInput] = useState('');

  const form = useForm<z.infer<typeof insertBlogPostSchema>>({
    resolver: zodResolver(insertBlogPostSchema),
    defaultValues: blogDefaultValues,
  });

  const mediaUrls = (form.watch('mediaUrls') as string[]) || [];

  useEffect(() => {
    const currentTags = (form.getValues('tags') as string[] | undefined) || [];
    setTagsInput(currentTags.join(', '));
  }, [form]);

  // Auto-generate slug from title until the user manually edits the slug
  // field. After that we leave their value alone.
  const titleValue = form.watch('title');
  useEffect(() => {
    if (slugTouchedRef.current) return;
    if (!titleValue) return;
    form.setValue('slug', slugify(titleValue), { shouldValidate: false });
  }, [titleValue, form]);

  const exec = (command: string, value?: string) => {
    if (typeof document === 'undefined') return;
    editorRef.current?.focus();
    // execCommand is technically deprecated but it remains the most
    // portable way to drive a contentEditable rich-text surface without a
    // dependency on a heavyweight editor library like TipTap or Slate.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    document.execCommand(command, false, value ?? null);
    syncContent();
  };

  const syncContent = () => {
    if (editorRef.current) {
      form.setValue('contentHtml', editorRef.current.innerHTML);
    }
  };

  const insertEmoji = (emoji: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    exec('insertText', emoji);
    setShowEmojiPicker(false);
  };

  const insertLink = () => {
    const url = window.prompt('Enter URL (include https://):');
    if (!url) return;
    exec('createLink', url);
  };

  /**
   * Insert an image at the current caret position. Called both from the
   * "Insert image URL" prompt and from the inline image upload button.
   */
  const insertImageAtCaret = (url: string) => {
    if (!url) return;
    editorRef.current?.focus();
    exec('insertImage', url);
  };

  const insertImagePrompt = () => {
    const url = window.prompt('Paste image URL:');
    if (url) insertImageAtCaret(url);
  };

  const onSubmit = async (values: z.infer<typeof insertBlogPostSchema>) => {
    // Normalize the slug one last time before submission in case the user
    // pasted something with whitespace or capitals.
    const finalSlug = slugify(values.slug);

    const res = await createBlogPost({
      ...values,
      slug: finalSlug,
      contentHtml: editorRef.current?.innerHTML || values.contentHtml,
    });

    if (!res?.success) {
      toast({ variant: 'destructive', description: res?.message || 'Failed to create blog post' });
      return;
    }

    toast({ description: res.message });
    router.push(`/blog/${finalSlug}`);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6 max-w-3xl text-slate-900"
      >

        {/* ── Cover Image — moved to top so it's the first thing you set ── */}
        <FormField
          control={form.control}
          name="coverImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700 text-sm font-semibold">
                Cover Image
                <span className="ml-2 text-[11px] font-normal text-slate-500">
                  (shown on the blog list and at the top of the post)
                </span>
              </FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {field.value ? (
                    <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={field.value}
                        alt="Cover preview"
                        className="w-full h-52 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <UploadButton
                          endpoint="blogMediaUploader"
                          appearance={{
                            button: 'bg-white text-slate-900 text-xs font-semibold px-4 py-2 rounded-full hover:bg-slate-100',
                            allowedContent: 'hidden',
                          }}
                          content={{ button: () => '↑ Replace image' }}
                          onClientUploadComplete={(res) => {
                            const first = res[0]?.url;
                            if (first) field.onChange(first);
                          }}
                          onUploadError={(error: Error) => {
                            toast({ variant: 'destructive', description: `Upload failed: ${error.message}` });
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-violet-400 transition-colors">
                      <div className="flex flex-col items-center justify-center py-10 gap-3 pointer-events-none">
                        <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-violet-500" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-semibold text-slate-700">Upload a cover image</p>
                          <p className="text-xs text-slate-500 mt-0.5">Recommended: 1200 × 630px · JPG or PNG</p>
                        </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <UploadButton
                          endpoint="blogMediaUploader"
                          appearance={{
                            button: 'bg-violet-600 text-white text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-violet-700 shadow-md',
                            allowedContent: 'hidden',
                            container: 'w-auto',
                          }}
                          content={{ button: () => '↑ Choose image' }}
                          onClientUploadComplete={(res) => {
                            const first = res[0]?.url;
                            if (first) field.onChange(first);
                          }}
                          onUploadError={(error: Error) => {
                            toast({ variant: 'destructive', description: `Upload failed: ${error.message}` });
                          }}
                        />
                      </div>
                      {/* Always-visible fallback button for click anywhere */}
                      <label className="absolute inset-0 cursor-pointer" />
                    </div>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700">Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter blog title"
                  className="bg-white text-slate-900 border-slate-300"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700">
                Slug
                <span className="ml-2 text-[11px] font-normal text-slate-500">
                  (URL path — auto-generated from title; edit if you want a custom one)
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="url-friendly-slug"
                  className="bg-white text-slate-900 border-slate-300 font-mono text-sm"
                  {...field}
                  onChange={(e) => {
                    slugTouchedRef.current = true;
                    field.onChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    // Normalize on blur so what they see is what gets saved
                    const cleaned = slugify(e.target.value);
                    field.onChange(cleaned);
                    field.onBlur();
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="excerpt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700">Excerpt</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Short summary shown on the blog list"
                  className="bg-white text-slate-900 border-slate-300"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ── Rich-text Content area ───────────────────────────────────── */}
        <div className="space-y-2">
          <FormLabel className="text-slate-700">Content</FormLabel>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-1 p-2 rounded-t-md border border-b-0 border-slate-300 bg-slate-50">
            {/* Text formatting */}
            <ToolbarButton title="Bold (Ctrl+B)" onClick={() => exec('bold')}>
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Italic (Ctrl+I)" onClick={() => exec('italic')}>
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Underline (Ctrl+U)" onClick={() => exec('underline')}>
              <Underline className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Headings */}
            <ToolbarButton title="Heading 1" onClick={() => exec('formatBlock', '<h1>')}>
              <Heading1 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Heading 2" onClick={() => exec('formatBlock', '<h2>')}>
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Heading 3" onClick={() => exec('formatBlock', '<h3>')}>
              <Heading3 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Paragraph" onClick={() => exec('formatBlock', '<p>')}>
              <Type className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Lists & quote */}
            <ToolbarButton title="Bullet list" onClick={() => exec('insertUnorderedList')}>
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Numbered list" onClick={() => exec('insertOrderedList')}>
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Block quote" onClick={() => exec('formatBlock', '<blockquote>')}>
              <Quote className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Link & image */}
            <ToolbarButton title="Insert link" onClick={insertLink}>
              <LinkIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Insert image by URL" onClick={insertImagePrompt}>
              <ImageIcon className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Color & font size */}
            <label
              className="flex items-center gap-1 p-1.5 rounded hover:bg-slate-200 cursor-pointer text-slate-700"
              title="Text color"
            >
              <Palette className="w-4 h-4" />
              <input
                type="color"
                className="w-4 h-4 border-0 bg-transparent p-0 cursor-pointer"
                onChange={(e) => exec('foreColor', e.target.value)}
              />
            </label>
            <select
              className="h-7 rounded border border-slate-300 bg-white text-slate-700 px-1.5 text-xs"
              onChange={(e) => exec('fontSize', e.target.value)}
              defaultValue="3"
              title="Font size"
            >
              <option value="2">Small</option>
              <option value="3">Normal</option>
              <option value="4">Large</option>
              <option value="5">XL</option>
            </select>

            <ToolbarDivider />

            {/* Emoji */}
            <ToolbarButton
              title="Emoji"
              onClick={() => setShowEmojiPicker((v) => !v)}
            >
              <SmilePlus className="w-4 h-4" />
            </ToolbarButton>

            <ToolbarDivider />

            {/* Undo / redo */}
            <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => exec('undo')}>
              <Undo2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton title="Redo (Ctrl+Y)" onClick={() => exec('redo')}>
              <Redo2 className="w-4 h-4" />
            </ToolbarButton>

            {/* Inline image upload — drops an image at the current cursor */}
            <div className="ml-auto">
              <UploadButton
                endpoint="blogMediaUploader"
                appearance={{
                  button:
                    'h-7 px-3 text-xs font-medium bg-violet-600 text-white rounded hover:bg-violet-700 ut-uploading:bg-violet-700',
                  allowedContent: 'hidden',
                }}
                content={{
                  button: ({ ready, isUploading }) =>
                    isUploading ? 'Uploading…' : ready ? 'Upload image' : 'Loading…',
                }}
                onClientUploadComplete={(res) => {
                  const url = res[0]?.url;
                  if (url) {
                    insertImageAtCaret(url);
                    toast({ description: 'Image inserted' });
                  }
                }}
                onUploadError={(error: Error) => {
                  toast({
                    variant: 'destructive',
                    description: `Upload failed: ${error.message}`,
                  });
                }}
              />
            </div>
          </div>

          {/* Emoji picker — light theme */}
          {showEmojiPicker && (
            <div className="flex flex-wrap gap-1 p-2 -mt-px rounded-md border border-slate-300 bg-white text-lg">
              {emojiList.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="hover:bg-slate-100 rounded px-1"
                  onClick={() => insertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* The editable surface itself — light, with prose styles so what
              the writer sees here matches the public post view. */}
          <div
            ref={editorRef}
            className="min-h-[280px] max-h-[60vh] overflow-y-auto bg-white border border-slate-300 rounded-b-md px-4 py-3 text-slate-900 prose prose-slate max-w-none focus:outline-none focus:ring-2 focus:ring-violet-300 prose-headings:text-slate-900 prose-p:text-slate-800 prose-img:rounded-lg prose-img:border prose-img:border-slate-200"
            contentEditable
            suppressContentEditableWarning
            onInput={syncContent}
            onBlur={syncContent}
            data-placeholder="Start writing your post… use the toolbar to format text, insert images, and add links anywhere."
          />
          <FormMessage />

          <p className="text-[11px] text-slate-500">
            Tip: place your cursor where you want an image, then click{' '}
            <span className="font-semibold">Upload image</span> in the toolbar.
            The image is inserted right at the cursor.
          </p>
        </div>

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-slate-700">Tags (comma-separated)</FormLabel>
              <FormControl>
                <Input
                  placeholder="rent collection, leases, maintenance"
                  className="bg-white text-slate-900 border-slate-300"
                  value={tagsInput}
                  onChange={(e) => {
                    const text = e.target.value;
                    setTagsInput(text);
                    const tags = text
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean);
                    field.onChange(tags);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel className="text-slate-700">
            Attachments (extra images, videos, files)
          </FormLabel>
          <FormControl>
            <UploadButton
              endpoint="blogMediaUploader"
              onClientUploadComplete={(res) => {
                const urls = res.map((r) => r.url).filter(Boolean);
                if (urls.length) {
                  form.setValue('mediaUrls', [...mediaUrls, ...urls]);
                }
              }}
              onUploadError={(error: Error) => {
                toast({ variant: 'destructive', description: `Upload failed: ${error.message}` });
              }}
            />
          </FormControl>
          {mediaUrls.length > 0 && (
            <ul className="mt-2 space-y-2 text-xs text-slate-600">
              {mediaUrls.map((url) => {
                const isImage = /\.(png|jpe?g|gif|webp|avif)$/i.test(url);
                return (
                  <li key={url} className="flex items-center gap-2">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt="Attachment preview"
                        className="w-10 h-10 rounded object-cover border border-slate-200"
                      />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">
                        FILE
                      </span>
                    )}
                    <span className="truncate max-w-xs">{url}</span>
                    <button
                      type="button"
                      onClick={() => insertImageAtCaret(url)}
                      className="ml-auto text-[11px] underline text-violet-600 hover:text-violet-700"
                      title="Insert this attachment into the post body at the cursor"
                    >
                      Insert in post
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white">
            <Save className="w-4 h-4" />
            Publish Post
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Toolbar primitives ──────────────────────────────────────────────────

function ToolbarButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor focus
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-700"
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-slate-300" aria-hidden />;
}
