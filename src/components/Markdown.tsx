import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";

export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-sm prose-invert max-w-none",
        "prose-headings:font-display prose-headings:tracking-tight",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h4:text-sm",
        "prose-p:leading-relaxed prose-p:my-2",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-a:text-primary hover:prose-a:underline",
        "prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-md",
        "prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:not-italic",
        "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:marker:text-primary",
        "prose-hr:border-border",
        "prose-table:text-xs prose-th:bg-muted prose-th:px-2 prose-th:py-1 prose-td:px-2 prose-td:py-1 prose-td:border prose-td:border-border prose-th:border prose-th:border-border",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
