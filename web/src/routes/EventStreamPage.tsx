import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

// Example event type, adjust as needed
export interface EventLog {
  id: string;
  entity_type: string;
  entity_id: string;
  type: string;
  payload?: Record<string, any>;
  created_by: string;
  created_at: string;
  summary?: string;
}

const ENTITY_TYPES = ['project', 'milestone', 'phase', 'task', 'bug'];
const EVENT_TYPES = ['status_change', 'agent_action', 'created', 'updated'];

export default function EventStreamPage() {
  const [entityType, setEntityType] = useState('');
  const [eventType, setEventType] = useState('');
  const [createdBy, setCreatedBy] = useState('');

  const fetchEvents = async ({ pageParam = 0 }) => {
    const params = new URLSearchParams();
    params.set('limit', '20');
    params.set('offset', String(pageParam));
    if (entityType) params.set('entity_type', entityType);
    if (eventType) params.set('type', eventType);
    if (createdBy) params.set('created_by', createdBy);
    const res = await fetch(`/v1/events?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['events', entityType, eventType, createdBy],
    queryFn: fetchEvents,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length * 20 : undefined,
    initialPageParam: 0,
  });

  const events = data?.pages.flat() ?? [];

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Event Stream</h1>
      <div className="flex gap-2 mb-4 sticky top-0 bg-white z-10 p-2 rounded shadow">
        <select className="input" value={entityType} onChange={e => setEntityType(e.target.value)}>
          <option value="">All Entities</option>
          {ENTITY_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select className="input" value={eventType} onChange={e => setEventType(e.target.value)}>
          <option value="">All Types</option>
          {EVENT_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Created by..."
          value={createdBy}
          onChange={e => setCreatedBy(e.target.value)}
        />
      </div>
      {isLoading && <p>Loading events...</p>}
      {error && <p className="text-red-500">Error loading events</p>}
      <ul className="space-y-2">
        {events.length === 0 && !isLoading && <li className="empty-state">No events found.</li>}
        {events.map((event: EventLog) => (
          <li key={event.id} className="card flex flex-col gap-1 border-l-4" style={{ borderColor: getEventColor(event.type) }}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{event.type}</span>
              <span className="text-xs text-gray-500">{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</span>
              <span className="text-xs text-gray-400">by {event.created_by}</span>
            </div>
            <div className="text-sm">{event.summary || JSON.stringify(event.payload)}</div>
            <div className="flex gap-2 text-xs text-blue-600 mt-1">
              <a href={`/${event.entity_type}s/${event.entity_id}`} className="underline">{event.entity_type}: {event.entity_id.slice(0, 8)}</a>
            </div>
          </li>
        ))}
      </ul>
      {hasNextPage && (
        <button
          className="button button--primary mt-4"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </button>
      )}
    </div>
  );
}

function getEventColor(type: string) {
  switch (type) {
    case 'status_change':
      return '#3b82f6'; // blue
    case 'agent_action':
      return '#10b981'; // green
    case 'created':
      return '#6366f1'; // indigo
    case 'updated':
      return '#f59e42'; // orange
    default:
      return '#d1d5db'; // gray
  }
}
