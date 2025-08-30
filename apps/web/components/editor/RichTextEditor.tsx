'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Mention from '@tiptap/extension-mention';
import { api } from '../../lib/api';
import { useUpload } from '../../hooks/useUpload';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link2,
  Image as ImageIcon
} from 'lucide-react';

interface RichTextEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

export function RichTextEditor({
  content = '',
  onChange,
  placeholder = 'Write something...',
  editable = true,
}: RichTextEditorProps) {
  const { uploadFile } = useUpload();
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      Placeholder.configure({
        placeholder,
      }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          items: async ({ query }) => {
            // Fetch users matching query
            try {
              const response = await api.get(`/api/users/search?q=${query}`);
              return response.data.data || response.data;
            } catch (error) {
              console.error('Failed to fetch users:', error);
              return [];
            }
          },
          render: () => {
            // Render mention dropdown
            let component: any;
            let popup: any;

            return {
              onStart: props => {
                component = document.createElement('div');
                component.className = 'suggestion';
                component.style.position = 'absolute';
                component.style.background = 'white';
                component.style.border = '1px solid #ccc';
                component.style.borderRadius = '4px';
                component.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                component.style.zIndex = '1000';
                component.style.maxHeight = '200px';
                component.style.overflowY = 'auto';
                component.style.width = '200px';
                document.body.appendChild(component);

                popup = {
                  show: () => {
                    component.style.display = 'block';
                    const rect = props.clientRect();
                    component.style.left = `${rect.left}px`;
                    component.style.top = `${rect.bottom}px`;
                  },
                  hide: () => {
                    component.style.display = 'none';
                  },
                  destroy: () => {
                    component.remove();
                  }
                };
                popup.show();
              },
              onUpdate(props) {
                component.innerHTML = '';
                props.items.forEach((item, index) => {
                  const button = document.createElement('button');
                  button.innerText = item.username;
                  button.style.display = 'block';
                  button.style.width = '100%';
                  button.style.padding = '8px 12px';
                  button.style.border = 'none';
                  button.style.background = 'transparent';
                  button.style.textAlign = 'left';
                  button.style.cursor = 'pointer';
                  button.style.borderBottom = index < props.items.length - 1 ? '1px solid #eee' : 'none';
                  button.onmouseover = () => button.style.background = '#f5f5f5';
                  button.onmouseout = () => button.style.background = 'transparent';
                  button.onclick = () => props.command({ id: item.id, label: item.username });
                  component.appendChild(button);
                });
              },
              onKeyDown(props) {
                if (props.event.key === 'Escape') {
                  popup.hide();
                  return true;
                }
                return false;
              },
              onExit() {
                popup.destroy();
              },
            };
          },
        },
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  if (!editable) {
    return (
      <div className="prose prose-sm max-w-none">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="border border-gray-300 rounded-lg">
      <div className="border-b border-gray-200 p-2 flex items-center space-x-2">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bold') ? 'bg-gray-100' : ''
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('italic') ? 'bg-gray-100' : ''
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('bulletList') ? 'bg-gray-100' : ''
          }`}
        >
          <List className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('orderedList') ? 'bg-gray-100' : ''
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-gray-100 ${
            editor.isActive('blockquote') ? 'bg-gray-100' : ''
          }`}
        >
          <Quote className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-gray-300" />

        <button
          onClick={() => {
            const url = window.prompt('Enter URL');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className="p-2 rounded hover:bg-gray-100"
        >
          <Link2 className="h-4 w-4" />
        </button>

        <button
          onClick={async () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) {
                const result = await uploadFile(file, 'image');
                const imageUrl = result.variants.find((v: any) => v.type === 'medium')?.url || result.url;
                editor.chain().focus().setImage({ src: imageUrl }).run();
              }
            };
            input.click();
          }}
          className="p-2 rounded hover:bg-gray-100"
        >
          <ImageIcon className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-gray-300" />

        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          <Undo className="h-4 w-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-100 disabled:opacity-50"
        >
          <Redo className="h-4 w-4" />
        </button>
      </div>

      <EditorContent
        editor={editor}
        className="p-4 min-h-[200px] prose prose-sm max-w-none focus:outline-none"
      />
    </div>
  );
}