'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, Typography } from '@nmspl/nm-ui-lib';

type User = {
  name: string;
  email: string;
  address: string;
  phone: string;
  website: string;
};

const ITEM_HEIGHT = 260; // Adjust based on actual card height
const VISIBLE_COUNT = 100;

export default function TaskBoardClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const isSearching = searchQuery.trim() !== '';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/file/user.json');
        const json: User[] = await res.json();
        setAllUsers(json);
      } catch (err) {
        console.error('Failed to load JSON:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!isSearching) return allUsers;
    const q = searchQuery.toLowerCase();
    return allUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        user.phone.toLowerCase().includes(q) ||
        user.address.toLowerCase().includes(q) ||
        user.website.toLowerCase().includes(q)
    );
  }, [searchQuery, allUsers]);

  const totalUsers = filteredUsers.length;
  const startIndex = Math.floor(scrollTop / ITEM_HEIGHT);
  const visibleUsers = filteredUsers.slice(
    startIndex,
    Math.min(startIndex + VISIBLE_COUNT, totalUsers)
  );

  const paddingTop = startIndex * ITEM_HEIGHT;
  const paddingBottom = Math.max(0, (totalUsers - (startIndex + VISIBLE_COUNT)) * ITEM_HEIGHT);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Search */}
      <div className="sticky top-0 z-10 bg-white shadow-md px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setScrollTop(0);
              if (containerRef.current) containerRef.current.scrollTop = 0;
            }}
            placeholder="Search users..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-2 text-sm text-gray-600">
            Showing {visibleUsers.length} of {totalUsers} users
          </p>
        </div>
      </div>

      {/* Virtual Scroller */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 h-[calc(90vh-80px)] overflow-y-auto"
      >
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : totalUsers === 0 ? (
          <div className="text-center text-gray-500 mt-10">
            <p>No users found{isSearching ? ' matching your search' : ''}.</p>
          </div>
        ) : (
          <div style={{ position: 'relative', minHeight: totalUsers * ITEM_HEIGHT }}>
            <div style={{ paddingTop, paddingBottom }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleUsers.map((user, index) => (
                  <Card
                    key={`${startIndex + index}-${searchQuery}`}
                    className="bg-white shadow-lg rounded-lg hover:shadow-xl transition-shadow duration-200"
                  >
                    <CardHeader className="bg-gray-50 border-b">
                      <Typography>{index}{user.name}</Typography>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <Typography>
                        <strong>Email:</strong>{' '}
                        <a
                          href={`mailto:${user.email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {user.email}
                        </a>
                      </Typography>
                      <Typography>
                        <strong>Phone:</strong>{' '}
                        <a
                          href={`tel:${user.phone}`}
                          className="text-blue-600 hover:underline"
                        >
                          {user.phone}
                        </a>
                      </Typography>
                      <Typography>
                        <strong>Address:</strong> {user.address}
                      </Typography>
                      <Typography>
                        <strong>Website:</strong>{' '}
                        <a
                          href={user.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {user.website}
                        </a>
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
