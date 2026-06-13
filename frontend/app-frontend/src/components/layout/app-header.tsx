'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Home,
  Music2,
  Bell,
  Upload,
  Users,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Search,
  LogOut,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { useNotificationWs } from '@/providers/notification-ws-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { autocomplete } from '@/lib/api/search';
import { cn } from '@/lib/utils';
import { storageUrl } from '@/lib/constants';
import type { AutocompleteSuggestion } from '@/lib/api/types';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { unreadCount } = useNotificationWs();
  const isAdmin = user?.role === 'ADMIN';

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(query, 250);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    autocomplete(debouncedQuery, 8)
      .then((res) => {
        setSuggestions(res.suggestions);
        setShowDropdown(res.suggestions.length > 0);
      })
      .catch(() => {});
  }, [debouncedQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowDropdown(false);
    }
  }

  function handleSuggestionClick(s: AutocompleteSuggestion) {
    setQuery('');
    setShowDropdown(false);
    router.push(s.type === 'track' ? `/track/${s.id}` : `/artist/${s.id}`);
  }

  function clearSearch() {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur z-20">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-1 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <Music2 className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-base font-bold hidden sm:block">Muze</span>
      </Link>

      {/* Back / Forward */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => router.forward()}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Center: Nav + Search */}
      <div className="flex flex-1 items-center justify-center gap-2">
        {/* Nav icons */}
        <nav className="flex items-center gap-0.5 shrink-0">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Button
                  variant={pathname === href ? 'secondary' : 'ghost'}
                  size="icon"
                  asChild
                >
                  <Link href={href}>
                    <Icon className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Search bar */}
        <div ref={searchRef} className="relative w-full max-w-md">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => { if (suggestions.length) setShowDropdown(true); }}
                placeholder="Bạn muốn phát nội dung gì?"
                className="h-9 rounded-full border-0 bg-muted pl-9 pr-8 focus-visible:ring-1"
              />
              {query && (
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  onClick={clearSearch}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          </form>

          {/* Autocomplete dropdown */}
          {showDropdown && (
            <div className="absolute top-full mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg z-50">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-accent"
                  onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(s); }}
                >
                  {s.imageUrl ? (
                    <img
                      src={storageUrl(s.imageUrl) ?? ''}
                      alt={s.text}
                      className={cn(
                        'h-8 w-8 shrink-0 object-cover',
                        s.type === 'artist' ? 'rounded-full' : 'rounded'
                      )}
                    />
                  ) : (
                    <div
                      className={cn(
                        'h-8 w-8 shrink-0 bg-muted',
                        s.type === 'artist' ? 'rounded-full' : 'rounded'
                      )}
                    />
                  )}
                  <div className="min-w-0 text-left">
                    <p className="truncate font-medium">{s.text}</p>
                    <p className="text-xs capitalize text-muted-foreground">{s.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={pathname.startsWith('/notifications') ? 'secondary' : 'ghost'}
              size="icon"
              className="relative"
              asChild
            >
              <Link href="/notifications">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* Upload */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={pathname.startsWith('/upload') ? 'secondary' : 'ghost'}
              size="icon"
              asChild
            >
              <Link href="/upload">
                <Upload className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upload Music</TooltipContent>
        </Tooltip>

        {/* Admin */}
        {isAdmin && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={pathname.startsWith('/admin') ? 'secondary' : 'ghost'}
                size="icon"
                asChild
              >
                <Link href="/admin/users">
                  <Users className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Manage Users</TooltipContent>
          </Tooltip>
        )}

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {mounted && resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={storageUrl(user?.avatarUrl) ?? undefined} />
                <AvatarFallback className="text-xs">
                  {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="truncate text-sm font-medium">{user?.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
