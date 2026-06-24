import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Trash2, Loader2, Play, Calendar } from 'lucide-react';
import { useProjectThumbnail } from '../components/hooks/useProjectThumbnail';
import { useProjectStore } from '../store/projectStore';
import type { ProjectResponse } from '../services/projectService';

interface ProjectCardProps {
  project: ProjectResponse;
  status: { label: string; color: string; bg: string };
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, status }) => {
  const thumbnailUrl = useProjectThumbnail(project.id);
  const { deleteProject } = useProjectStore();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
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
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  return (
    <Link to={`/project/${project.id}`} className="block group">
      <div
        className="relative overflow-hidden rounded-2xl border border-[#2a2a3e] bg-[#16161e]
                   transition-all duration-300 hover:border-violet-500/50 
                   hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1"
      >
        {/* ═══════════ Thumbnail Section ═══════════ */}
        <div className="relative aspect-video bg-gradient-to-br from-[#1a1a24] to-[#0d0d14] overflow-hidden">
          {thumbnailUrl ? (
            <>
            {/* Loading skeleton */}
            {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a24] to-[#0d0d14] animate-pulse" />
            )}

            {/*Blurred background fill (same image, blurred & scaled) */}
            <img
                src={thumbnailUrl}
                alt=""
                aria-hidden="true"
                className={`absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-50 
                        ${imageLoaded ? 'opacity-50' : 'opacity-0'}`}
            />

            {/* Main image (contained, fully visible) */}
            <img
                src={thumbnailUrl}
                alt={project.title}
                onLoad={() => setImageLoaded(true)}
                className={`relative w-full h-full object-contain transition-all duration-500 
                        group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            </>
        ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
                <Film className="w-8 h-8 text-violet-400/60" />
            </div>
            <span className="text-xs text-gray-600">No preview</span>
            </div>
        )}

          {/* Dark gradient overlay for text readability */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40
                       opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          />

          {/* Play icon on hover (only if thumbnail exists) */}
          {thumbnailUrl && (
            <div
              className="absolute inset-0 flex items-center justify-center 
                         opacity-0 group-hover:opacity-100 transition-all duration-300"
            >
              <div
                className="p-4 rounded-full bg-violet-500/90 backdrop-blur-sm 
                           shadow-2xl shadow-violet-500/50 transform scale-75 
                           group-hover:scale-100 transition-transform duration-300"
              >
                <Play className="w-6 h-6 text-white fill-white" />
              </div>
            </div>
          )}

          {/* ─── Top badges row ─── */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
            {/* Aspect ratio */}
            <div
              className="px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-lg 
                         border border-white/10 shadow-lg"
            >
              <span className="text-xs font-mono font-medium text-white">
                {project.aspectRatio}
              </span>
            </div>

            {/* Status badge */}
            <div
              className={`px-2.5 py-1 ${status.bg} backdrop-blur-md rounded-lg 
                          border border-white/5 shadow-lg`}
            >
              <span className={`text-xs font-semibold ${status.color}`}>
                {status.label}
              </span>
            </div>
          </div>

          {/* ─── Delete button (bottom-right, on hover) ─── */}
          {!showConfirm && (
            <button
              onClick={handleDeleteClick}
              className="absolute bottom-3 right-3 p-2 bg-black/70 hover:bg-red-500 
                         backdrop-blur-md rounded-lg text-white border border-white/10
                         opacity-0 group-hover:opacity-100 
                         transition-all duration-200 hover:scale-110 hover:shadow-lg 
                         hover:shadow-red-500/50 z-20"
              title="Delete project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* ─── Delete Confirmation Overlay ─── */}
          {showConfirm && (
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-md 
                         flex flex-col items-center justify-center gap-3 p-4 z-30
                         animate-fade-in"
            >
              {isDeleting ? (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-full" />
                    <Loader2 className="relative w-10 h-10 text-red-400 animate-spin" />
                  </div>
                  <p className="text-sm text-white font-medium">Deleting project...</p>
                </>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-red-500/20 border border-red-500/30">
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">Delete this project?</p>
                    <p className="text-xs text-gray-400 mt-1">
                      This action cannot be undone
                    </p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={handleCancelDelete}
                      className="px-4 py-2 bg-[#2a2a3e] hover:bg-[#3a3a4e] text-white 
                                 text-xs font-medium rounded-lg transition-all hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
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
          )}
        </div>

        {/* ═══════════ Card Body ═══════════ */}
        <div className="p-4">
          <h3
            className="font-semibold text-white text-sm sm:text-base mb-1.5 line-clamp-1
                       group-hover:text-violet-300 transition-colors duration-200"
          >
            {project.title}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(project.createdAt)}</span>
          </div>
        </div>

        {/* Bottom accent line on hover */}
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r 
                     from-violet-500 via-purple-500 to-violet-500
                     scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
        />
      </div>
    </Link>
  );
};