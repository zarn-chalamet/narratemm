import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Clock, CheckCircle2, Loader2, Film, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  transcribing: { label: 'Transcribing', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  scripting: { label: 'Writing Script', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  voiceover: { label: 'Generating Voice', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  editing: { label: 'Editing', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  exporting: { label: 'Exporting', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  done: { label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/10' },
  failed: { label: 'Failed', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { projects, isLoading, error, loadProjects } = useProjectStore();
  useEffect(() => {
    loadProjects();
  }, []);

  const stats = [
    { label: 'Total', value: projects.length, icon: Film, color: 'from-violet-500 to-purple-500' },
    { label: 'Done', value: projects.filter((p) => p.status === 'done').length, icon: CheckCircle2, color: 'from-green-500 to-emerald-500' },
    { label: 'In Progress', value: projects.filter((p) => !['done', 'failed', 'draft'].includes(p.status)).length, icon: Clock, color: 'from-blue-500 to-cyan-500' },
    { label: 'This Week', value: projects.filter((p) => {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return new Date(p.createdAt).getTime() > weekAgo;
    }).length, icon: TrendingUp, color: 'from-orange-500 to-amber-500' },
  ];

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mt-1">Ready to create your next viral drama recap?</p>
        </div>
        <Link to="/new-project" className="hidden sm:block">
          <Button leftIcon={<Plus className="w-4 h-4" />}>New Project</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-400 truncate">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-br ${stat.color} flex-shrink-0`}>
                <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-white">Recent Projects</h2>
          <Link to="/history" className="text-sm text-violet-400 hover:text-violet-300">View all →</Link>
        </div>

        {error && (
          <div className="p-4 mb-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 flex items-center justify-center">
              <Film className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6 max-w-sm mx-auto text-sm">Create your first drama recap project!</p>
            <Link to="/new-project">
              <Button leftIcon={<Plus className="w-4 h-4" />}>Create First Project</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => {
              const status = statusConfig[project.status] || statusConfig.draft;
              return (
                <Link to={`/project/${project.id}`} key={project.id}>
                  <Card className="group" hover>
                    <div className="relative aspect-video bg-[#1a1a24] rounded-t-2xl overflow-hidden">
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-12 h-12 text-gray-700" />
                      </div>
                      <div className={`absolute top-2 right-2 px-2 py-1 ${status.bg} backdrop-blur-sm rounded-lg`}>
                        <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs text-white">
                        {project.aspectRatio}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-white truncate text-sm sm:text-base">{project.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">{formatDate(project.createdAt)}</p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
