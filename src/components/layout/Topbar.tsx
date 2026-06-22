import { useState, useRef, useEffect } from "react";
import { Search, Bell, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/api/notifications";
import { useAuthStore } from "@/store/auth";
import { Avatar } from "@/components/ui/Avatar";
import { timeAgo } from "@/utils/format";
import { cn } from "@/utils/cn";
import { useNavigate } from "react-router-dom";
import client from "@/api/client";

export function Topbar({ title }: { title?: string }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<unknown[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: unreadData } = useQuery({
    queryKey: ["notif-count"],
    queryFn: () => notificationsApi.unreadCount().then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: notifsData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: notifOpen,
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notif-count"] });
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!search.trim()) return;
    const t = setTimeout(async () => {
      try {
        const r = await client.get("/search", { params: { q: search } });
        setSearchResults((r.data as { data: unknown[] }).data ?? []);
      } catch (e) {
        void e;
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const unread = unreadData?.count ?? 0;
  const notifs = notifsData?.data ?? [];

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-base font-semibold text-slate-900">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, logs, issues..."
            className="w-72 pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/10 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X size={12} />
            </button>
          )}
          {search.trim() && searchResults.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
              {(
                searchResults as Array<{
                  type: string;
                  id: string;
                  title: string;
                }>
              )
                .slice(0, 6)
                .map((r, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSearch("");
                      navigate(`/${r.type}s/${r.id}`);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3"
                  >
                    <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded capitalize">
                      {r.type}
                    </span>
                    {r.title}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-900">
                  Notifications
                </span>
                {unread > 0 && (
                  <button
                    onClick={() => markAll.mutate()}
                    className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {notifs.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No notifications
                  </p>
                ) : (
                  notifs.map((n) => {
                    const notif = n as {
                      id: string;
                      title: string;
                      body: string;
                      is_read: boolean;
                      created_at: string;
                    };
                    return (
                      <div
                        key={notif.id}
                        className={cn(
                          "px-4 py-3",
                          !notif.is_read && "bg-orange-50/50",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {!notif.is_read && (
                            <span className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">
                              {notif.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                              {notif.body}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {timeAgo(notif.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        {user && (
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2.5 pl-3 border-l border-slate-200"
          >
            <Avatar name={user.name} src={user.avatar_url} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-slate-800 leading-none">
                {user.name}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 capitalize">
                {user.role}
              </p>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
