import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Loader2, Film } from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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

export const HistoryPage: React.FC = () => {
  const { projects, isLoading, loadProjects } = useProjectStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Project History</h1>
          <p className="text-gray-400 mt-1">All your drama recap projects</p>
        </div>
        <Link to="/new-project">
          <Button>New Project</Button>
        </Link>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input type="text" placeholder="Search projects..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-[#1a1a24] border border-[#2a2a3e] rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-violet-500">
              <option value="all">All Status</option>
              <option value="done">Completed</option>
              <option value="exporting">Exporting</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <Film className="w-8 h-8 text-violet-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No matching projects' : 'No projects yet'}
          </h3>
          <p className="text-gray-400 mb-6">
            {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first drama recap project!'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Link to="/new-project"><Button>Create Project</Button></Link>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const status = statusConfig[project.status] || statusConfig.draft;
            return (
              <Card key={project.id} className="relative">
                <Link to={`/project/${project.id}`} className="flex flex-col sm:flex-row">
                  <div className="relative w-full sm:w-48 aspect-video sm:aspect-auto bg-[#1a1a24] rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none overflow-hidden flex-shrink-0">
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-10 h-10 text-gray-700" />
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate">{project.title}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                        <span>{formatDate(project.createdAt)}</span>
                        <span>•</span>
                        <span>{project.aspectRatio}</span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 ${status.bg} rounded-lg self-start`}>
                      <span className={`text-sm font-medium ${status.color}`}>{status.label}</span>
                    </div>
                  </div>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
