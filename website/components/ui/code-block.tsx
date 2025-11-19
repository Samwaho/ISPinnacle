import * as React from "react";
import { cn } from "@/lib/utils";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

type CodeBlockProps = React.HTMLAttributes<HTMLPreElement> & {
  text: string;
};

export const CodeBlock = ({ text, className, ...props }: CodeBlockProps) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute right-3 top-3 h-7 gap-1 rounded-full border bg-background/90 text-muted-foreground shadow-sm backdrop-blur"
        onClick={handleCopy}
        type="button"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        <span className="text-xs font-medium">{copied ? "Copied" : "Copy"}</span>
        <span className="sr-only">Copy command</span>
      </Button>
      <pre
        className={cn(
          "rounded-lg border bg-muted/40 p-4 pr-28 pt-5 text-sm font-mono whitespace-pre-wrap break-words",
          copied && "outline outline-2 outline-primary/50",
          className
        )}
        {...props}
      >
        <code>{text}</code>
      </pre>
    </div>
  );
};
