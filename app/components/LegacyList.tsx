"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LegacyRepo } from '@/types/legacy-repo';

export default function LegacyList() {
  const [repos, setRepos] = useState<LegacyRepo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const response = await fetch('/api/repos');
      if (response.ok) {
        const data = await response.json();
        // Show only first 6 repos as showcase
        setRepos(data.slice(0, 6));
      }
    } catch (error) {
      console.error('Failed to fetch repos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="legacy-list" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="font-heading text-4xl sm:text-5xl font-bold mb-4 text-black">
              Legacy List
            </h2>
            <p className="font-body text-black/80 text-lg">
              Browse and explore GitHub repositories created for the room project. These repositories are widgets that can later be added to the room space for you to try and interact with.
            </p>
          </div>
          <Link
            href="/legacy-list"
            className="inline-block px-6 py-3 bg-primary text-white font-body text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors duration-200 shadow-md hover:shadow-lg whitespace-nowrap"
          >
            View All Repositories
          </Link>
        </div>

        {/* Repos Grid */}
        {loading ? (
          <div className="text-center py-12 text-black/60">
            Loading repositories...
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-12 text-black/60">
            No repositories available yet. Check back later!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="group relative bg-white p-6 rounded-2xl border-2 border-black/20 shadow-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-primary overflow-hidden"
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-300 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-heading text-xl font-bold mb-2 text-black group-hover:text-primary transition-colors">
                        {repo.repo_name}
                      </h3>
                      <p className="font-body text-sm text-black/60 mb-1">
                        Created by:{' '}
                        <span className="font-medium text-black/80">
                          {repo.created_by}
                        </span>
                      </p>
                      <p className="font-body text-sm text-black/60">
                        {new Date(repo.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {repo.svg_image_url && (
                      <div className="ml-4 flex-shrink-0">
                        <img
                          src={repo.svg_image_url}
                          alt={repo.repo_name}
                          className="w-16 h-16 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <a
                      href={repo.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full px-4 py-2 bg-primary text-white text-center rounded-lg font-body text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      View on GitHub
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

