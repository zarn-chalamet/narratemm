import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Loader2, Film, Plus, Calendar,
  X, SlidersHorizontal, FolderOpen, Sparkles, Trash2,
} from 'lucide-react';
import { useProjectStore } from '../store/projectStore';
import { Button } from '../components/ui/Button';
import { ProjectCard } from '../components/ProjectCard';
import { SelectField } from '../components/ui/SelectField';
import { useProjectThumbnail } from '../components/hooks/useProjectThumbnail';
import { STATUS_OPTIONS, getStatusStyle } from '../constants/ProjectStatus';
import type { StatusStyle } from '../constants/ProjectStatus';
import type { ProjectResponse } from '../services/projectService';

// ─────────────────────────────────────────────
// CONSTANTS (history-page specific)
// ─────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'oldest',    label: 'Oldest First' },
  { value: 'name',      label: 'Name (A-Z)'   },
  { value: 'name-desc', label: 'Name (Z-A)'   },
] as const;

const MAX_QUICK_FILTERS = 5;

type ViewMode = 'grid' | 'list';

// ─────────────────────────────────────────────
// HELPERS (history-page specific)
// ─────────────────────────────────────────────

const formatDate = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const sortProjects = (
  list: ProjectResponse[],
  sortBy: string,
): ProjectResponse[] => {
  const sorted = [...list];
  switch (sortBy) {
    case 'oldest':
      return sorted.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    case 'name':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'name-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
};

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────

const GridIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z
         M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z
         M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z
         M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    />
  </svg>
);

const ListIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 6h16M4 10h16M4 14h16M4 18h16"
    />
  </svg>
);

// ─────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────

const PageHeader: React.FC<{ projectCount: number }> = ({ projectCount }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20
                        border border-violet-500/30">
          <FolderOpen className="w-5 h-5 text-violet-400" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300
                       bg-clip-text text-transparent">
          Project History
        </h1>
      </div>
      <p className="text-sm text-gray-400 ml-12">
        {projectCount === 0
          ? 'Your projects will appear here'
          : `${projectCount} ${projectCount === 1 ? 'project' : 'projects'} total`}
      </p>
    </div>
    <Link to="/new-project">
      <Button leftIcon={<Plus className="w-4 h-4" />}>New Project</Button>
    </Link>
  </div>
);

// ─────────────────────────────────────────────
// SEARCH INPUT
// ─────────────────────────────────────────────

const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => (
  <div className="relative flex-1">
    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    <input
      type="text"
      placeholder="Search by project title..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full pl-11 pr-10 py-3 bg-[#16161e] border border-[#2a2a3e] rounded-xl
                 text-white text-sm placeholder-gray-500
                 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                 transition-all"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg
                   text-gray-500 hover:text-white hover:bg-white/10 transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────
// VIEW TOGGLE
// ─────────────────────────────────────────────

const ViewToggle: React.FC<{
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}> = ({ viewMode, onChange }) => {
  const modes: { mode: ViewMode; icon: React.ReactNode; title: string }[] = [
    { mode: 'grid', icon: <GridIcon />, title: 'Grid view' },
    { mode: 'list', icon: <ListIcon />, title: 'List view' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-[#16161e] border border-[#2a2a3e] rounded-xl">
      {modes.map(({ mode, icon, title }) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          title={title}
          className={`p-2 rounded-lg transition-all ${
            viewMode === mode
              ? 'bg-violet-500/20 text-violet-400'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// QUICK FILTERS
// ─────────────────────────────────────────────

const QuickFilters: React.FC<{
  statusFilter: string;
  statusCounts: Record<string, number>;
  hasFilters: boolean;
  onFilterChange: (value: string) => void;
  onClear: () => void;
}> = ({ statusFilter, statusCounts, hasFilters, onFilterChange, onClear }) => {
  const chips = useMemo(
    () =>
      STATUS_OPTIONS
        .filter((opt) => opt.value === 'all' || (statusCounts[opt.value] ?? 0) > 0)
        .slice(0, MAX_QUICK_FILTERS),
    [statusCounts],
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {chips.map((opt) => {
        const isActive = statusFilter === opt.value;
        const count = statusCounts[opt.value] ?? 0;
        return (
          <button
            key={opt.value}
            onClick={() => onFilterChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                       flex items-center gap-2 ${
              isActive
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                : 'bg-[#16161e] text-gray-400 border border-[#2a2a3e] hover:border-violet-500/50 hover:text-white'
            }`}
          >
            <span>{opt.label}</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
              isActive ? 'bg-white/20' : 'bg-[#2a2a3e]'
            }`}>
              {count}
            </span>
          </button>
        );
      })}

      {hasFilters && (
        <button
          onClick={onClear}
          className="px-3 py-1.5 rounded-lg text-xs font-medium
                     bg-red-500/10 text-red-400 border border-red-500/30
                     hover:bg-red-500/20 transition-all flex items-center gap-1.5"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// RESULTS SUMMARY
// ─────────────────────────────────────────────

const ResultsSummary: React.FC<{ filtered: number; total: number }> = ({
  filtered,
  total,
}) => (
  <div className="flex items-center justify-between text-sm">
    <p className="text-gray-400">
      Showing <span className="text-white font-semibold">{filtered}</span>
      {' '}of{' '}
      <span className="text-white font-semibold">{total}</span> projects
    </p>
  </div>
);

// ─────────────────────────────────────────────
// LOADING SPINNER
// ─────────────────────────────────────────────

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-3">
    <div className="relative">
      <div className="absolute inset-0 bg-violet-500/30 blur-2xl rounded-full" />
      <Loader2 className="relative w-10 h-10 text-violet-400 animate-spin" />
    </div>
    <p className="text-sm text-gray-500">Loading your projects...</p>
  </div>
);

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────

const EmptyState: React.FC<{
  hasFilters: boolean;
  onClearFilters: () => void;
}> = ({ hasFilters, onClearFilters }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full" />
      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20
                      border border-violet-500/30 flex items-center justify-center">
        {hasFilters
          ? <Search className="w-9 h-9 text-violet-400" />
          : <Sparkles className="w-9 h-9 text-violet-400" />}
      </div>
    </div>
    <h3 className="text-xl font-bold text-white mb-2">
      {hasFilters ? 'No matching projects' : 'No projects yet'}
    </h3>
    <p className="text-sm text-gray-400 max-w-md mb-6">
      {hasFilters
        ? "Try adjusting your search query or filters to find what you're looking for"
        : 'Start your journey by creating your first drama recap project!'}
    </p>
    {hasFilters ? (
      <Button
        variant="outline"
        onClick={onClearFilters}
        leftIcon={<X className="w-4 h-4" />}
      >
        Clear All Filters
      </Button>
    ) : (
      <Link to="/new-project">
        <Button leftIcon={<Plus className="w-4 h-4" />}>Create First Project</Button>
      </Link>
    )}
  </div>
);

// ─────────────────────────────────────────────
// DELETE OVERLAY
// ─────────────────────────────────────────────

const DeleteOverlay: React.FC<{
  title: string;
  isDeleting: boolean;
  onConfirm: (e: React.MouseEvent) => void;
  onCancel: (e: React.MouseEvent) => void;
}> = ({ title, isDeleting, onConfirm, onCancel }) => (
  <div
    className="absolute inset-0 bg-black/90 backdrop-blur-md
               flex items-center justify-center gap-4 p-4 z-30 animate-fade-in"
  >
    {isDeleting ? (
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-full" />
          <Loader2 className="relative w-6 h-6 text-red-400 animate-spin" />
        </div>
        <p className="text-sm text-white font-medium">Deleting project...</p>
      </div>
    ) : (
      <>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Delete &quot;{title}&quot;?</p>
            <p className="text-xs text-gray-400 mt-0.5">This action cannot be undone</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white
                       text-xs font-medium rounded-lg transition-all hover:scale-105"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600
                       hover:from-red-600 hover:to-red-700 text-white
                       text-xs font-medium rounded-lg transition-all hover:scale-105
                       shadow-lg shadow-red-500/30"
          >
            Delete
          </button>
        </div>
      </>
    )}
  </div>
);

// ─────────────────────────────────────────────
// THUMBNAIL
// ─────────────────────────────────────────────

const Thumbnail: React.FC<{
  projectId: string;
  title: string;
  aspectRatio: string;
}> = ({ projectId, title, aspectRatio }) => {
  const thumbnailUrl = useProjectThumbnail(projectId);
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className="relative w-full sm:w-56 aspect-video sm:aspect-[16/10]
                 bg-gradient-to-br from-[#1a1a24] to-[#0d0d14]
                 overflow-hidden flex-shrink-0"
    >
      {thumbnailUrl ? (
        <>
          {!loaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a24] to-[#0d0d14] animate-pulse" />
          )}
          <img
            src={thumbnailUrl}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover scale-110 blur-2xl
                       ${loaded ? 'opacity-40' : 'opacity-0'}`}
          />
          <img
            src={thumbnailUrl}
            alt={title}
            onLoad={() => setLoaded(true)}
            className={`relative w-full h-full object-contain transition-all duration-500
                       group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Film className="w-6 h-6 text-violet-400/60" />
          </div>
        </div>
      )}
      <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-md
                      rounded-md border border-white/10">
        <span className="text-[10px] font-mono font-medium text-white">{aspectRatio}</span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// PROJECT LIST ITEM
// ─────────────────────────────────────────────

const ProjectListItem: React.FC<{
  project: ProjectResponse;
  status: StatusStyle;
}> = ({ project, status }) => {
  const { deleteProject } = useProjectStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  }, []);

  const handleConfirmDelete = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    try {
      await deleteProject(project.id);
    } catch (err) {
      console.error('Failed to delete:', err);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  }, [deleteProject, project.id]);

  const handleCancelDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  }, []);

  return (
    <Link to={`/project/${project.id}`} className="block group">
      <div
        className="relative overflow-hidden rounded-2xl border border-[#2a2a3e] bg-[#16161e]
                   transition-all duration-300 hover:border-violet-500/50
                   hover:shadow-xl hover:shadow-violet-500/10"
      >
        <div className="flex flex-col sm:flex-row">
          <Thumbnail
            projectId={project.id}
            title={project.title}
            aspectRatio={project.aspectRatio}
          />

          {/* Content */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-base sm:text-lg mb-2 line-clamp-1
                             group-hover:text-violet-300 transition-colors">
                {project.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(project.createdAt)}</span>
                </div>
                <span className="text-gray-700">•</span>
                <span className="font-mono">{project.aspectRatio}</span>
              </div>
            </div>

            {/* Status + Delete */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className={`flex items-center gap-2 px-3 py-2 ${status.bg} rounded-xl border border-white/5`}>
                <span className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
                <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
              </div>
              <button
                onClick={handleDeleteClick}
                className="p-2.5 rounded-xl bg-[#1a1a24] hover:bg-red-500/20
                           border border-[#2a2a3e] hover:border-red-500/50
                           text-gray-500 hover:text-red-400
                           transition-all duration-200 hover:scale-105
                           opacity-60 group-hover:opacity-100"
                title="Delete project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Hover accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r
                     from-violet-500 via-purple-500 to-violet-500
                     scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
        />

        {showConfirm && (
          <DeleteOverlay
            title={project.title}
            isDeleting={isDeleting}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}
      </div>
    </Link>
  );
};

// ─────────────────────────────────────────────
// PROJECT GRID / LIST RENDERER
// ─────────────────────────────────────────────

const ProjectList: React.FC<{
  projects: ProjectResponse[];
  viewMode: ViewMode;
}> = ({ projects, viewMode }) => {
  if (viewMode === 'grid') {
    return (
      <div className="grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            status={getStatusStyle(project.status)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((project) => (
        <ProjectListItem
          key={project.id}
          project={project}
          status={getStatusStyle(project.status)}
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────

export const HistoryPage: React.FC = () => {
  const { projects, isLoading, loadProjects } = useProjectStore();

  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy]             = useState('newest');
  const [viewMode, setViewMode]         = useState<ViewMode>('grid');

  useEffect(() => {
    loadProjects();
  }, []);

  const hasFilters = Boolean(searchQuery) || statusFilter !== 'all';

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
  }, []);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = projects.filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    return sortProjects(filtered, sortBy);
  }, [projects, searchQuery, statusFilter, sortBy]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  return (
    <div className="space-y-6 animate-fade-in">

      <PageHeader projectCount={projects.length} />

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <SearchInput value={searchQuery} onChange={setSearchQuery} />

          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_OPTIONS}
            icon={<Filter className="w-4 h-4" />}
          />

          <SelectField
            value={sortBy}
            onChange={setSortBy}
            options={SORT_OPTIONS}
            icon={<SlidersHorizontal className="w-4 h-4" />}
          />

          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {projects.length > 0 && (
          <QuickFilters
            statusFilter={statusFilter}
            statusCounts={statusCounts}
            hasFilters={hasFilters}
            onFilterChange={setStatusFilter}
            onClear={clearFilters}
          />
        )}
      </div>

      {/* Results summary */}
      {!isLoading && projects.length > 0 && (
        <ResultsSummary
          filtered={filteredProjects.length}
          total={projects.length}
        />
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filteredProjects.length === 0 ? (
        <EmptyState hasFilters={hasFilters} onClearFilters={clearFilters} />
      ) : (
        <ProjectList projects={filteredProjects} viewMode={viewMode} />
      )}

    </div>
  );
};