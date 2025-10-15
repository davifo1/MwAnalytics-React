import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export function SidebarHeader() {
  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between gap-2.5 px-3.5 h-[70px]">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-[42px] h-[42px] bg-primary/10 rounded-lg flex items-center justify-center">
            <Zap className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-mono">Magic Wings</h1>
            <p className="text-xs text-muted-foreground">Server Manager v1.0</p>
          </div>
        </Link>
      </div>
    </div>
  );
}