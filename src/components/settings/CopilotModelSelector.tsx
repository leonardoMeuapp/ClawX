import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CopilotModelSelectorProps {
  models: string[];
  activeModel: string;
  onSelectModel: (modelId: string) => void;
}

export function CopilotModelSelector({
  models,
  activeModel,
  onSelectModel,
}: CopilotModelSelectorProps) {
  return (
    <div className="space-y-1.5">
      <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Models
      </span>
      <div className="grid gap-1">
        {models.map((modelId) => {
          const isActive = modelId === activeModel;
          return (
            <button
              key={modelId}
              type="button"
              onClick={() => onSelectModel(modelId)}
              className={cn(
                'flex items-center justify-between w-full px-3 py-2 rounded-lg text-left text-[13px] transition-colors',
                isActive
                  ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
                  : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent',
              )}
            >
              <span className="font-mono">{modelId}</span>
              {isActive && (
                <Check className="h-4 w-4 text-blue-500 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
