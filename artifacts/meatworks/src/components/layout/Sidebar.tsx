import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Settings,
  LogOut,
  Beef
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-sidebar-primary">
          <Beef className="h-6 w-6" />
          MEATWORKS
        </Link>
      </div>
      
      <div className="flex flex-1 flex-col overflow-y-auto pt-6 pb-4">
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 shrink-0",
                    isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
        
        <div className="mt-8 px-3">
          <div className="space-y-1">
            <button className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
              <Settings className="mr-3 h-5 w-5 shrink-0 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70" />
              Settings
            </button>
            <button className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
              <LogOut className="mr-3 h-5 w-5 shrink-0 text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70" />
              Sign out
            </button>
          </div>
        </div>
      </div>
      
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-primary font-bold">
            OM
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-none">Ops Manager</span>
            <span className="text-xs text-sidebar-foreground/50 mt-1">Admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
