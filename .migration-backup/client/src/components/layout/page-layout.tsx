import SidebarNav from "@/components/layout/sidebar-nav";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full";
  headerAction?: {
    label: string;
    icon?: LucideIcon;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
  showNav?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

export default function PageLayout({
  children,
  title,
  subtitle,
  maxWidth = "4xl",
  headerAction,
  showNav = true,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {showNav && <SidebarNav />}
      <main className={`lg:ml-64 pb-20 lg:pb-8 pt-4 ${maxWidthClasses[maxWidth]} mx-auto px-4`}>
        {(title || headerAction) && (
          <div className="mb-6 flex items-center justify-between">
            <div>
              {title && (
                <h1 className="text-2xl font-bold mb-1" data-testid="page-title">
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground" data-testid="page-subtitle">
                  {subtitle}
                </p>
              )}
            </div>
            {headerAction && (
              <Button
                onClick={headerAction.onClick}
                disabled={headerAction.disabled || headerAction.loading}
                data-testid="page-header-action"
              >
                {headerAction.icon && (
                  <headerAction.icon className="w-4 h-4 mr-2" />
                )}
                {headerAction.label}
              </Button>
            )}
          </div>
        )}
        {children}
      </main>
      {showNav && <MobileNav />}
    </div>
  );
}

export function PageSection({
  children,
  title,
  className = "",
}: {
  children: React.ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <section className={`mb-8 ${className}`}>
      {title && (
        <h2 className="text-lg font-semibold mb-4" data-testid={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline" data-testid="empty-state-action">
          {action.label}
        </Button>
      )}
    </div>
  );
}
