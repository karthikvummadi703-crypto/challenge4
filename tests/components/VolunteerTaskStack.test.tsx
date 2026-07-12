// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const { default: VolunteerTaskStack } = await import('../../src/components/volunteer/VolunteerTaskStack');

const makeTask = (overrides: Partial<import('../../src/types').Task> = {}): import('../../src/types').Task => ({
  id: 'task-1',
  type: 'Deliver Food',
  details: 'Deliver nachos to seat',
  seatNumber: 'A12-24',
  priority: 'Medium',
  status: 'pending',
  assignedTo: undefined,
  timestamp: new Date().toISOString(),
  ...overrides,
});

const defaultProps = {
  myAssignedTasks: [],
  otherTasks: [],
  onHighlightSeat: vi.fn(),
  onAcceptTask: vi.fn(),
  onCompleteTask: vi.fn(),
};

describe('VolunteerTaskStack', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders empty-state messages when no tasks', () => {
    render(<VolunteerTaskStack {...defaultProps} />);
    expect(screen.getByText(/you do not have any active assignments/i)).toBeInTheDocument();
    expect(screen.getByText(/no pending alerts in stack/i)).toBeInTheDocument();
  });

  it('renders an assigned task with details and seat number', () => {
    const assigned = makeTask({ id: 'a1', status: 'accepted', assignedTo: 'VOL-1234', details: 'Bring water', seatNumber: 'B05-10' });
    render(<VolunteerTaskStack {...defaultProps} myAssignedTasks={[assigned]} />);
    expect(screen.getByText('Bring water')).toBeInTheDocument();
    expect(screen.getByText('B05-10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /complete assignment/i })).toBeInTheDocument();
  });

  it('renders pending tasks in the live task stack', () => {
    const pending = makeTask({ id: 'p1', details: 'Fix broken seat', seatNumber: 'C18-03', type: 'Seat Issue' });
    render(<VolunteerTaskStack {...defaultProps} otherTasks={[pending]} />);
    expect(screen.getByText('Fix broken seat')).toBeInTheDocument();
    expect(screen.getByText('1 pending queues')).toBeInTheDocument();
  });

  it('calls onCompleteTask with the task id when Complete Assignment is clicked', () => {
    const onCompleteTask = vi.fn();
    const assigned = makeTask({ id: 'task-complete', status: 'accepted', assignedTo: 'VOL-1234' });
    render(<VolunteerTaskStack {...defaultProps} myAssignedTasks={[assigned]} onCompleteTask={onCompleteTask} />);
    fireEvent.click(screen.getByRole('button', { name: /complete assignment/i }));
    expect(onCompleteTask).toHaveBeenCalledTimes(1);
    expect(onCompleteTask).toHaveBeenCalledWith('task-complete');
  });

  it('calls onAcceptTask when Accept button on a pending task is clicked', () => {
    const onAcceptTask = vi.fn();
    const pending = makeTask({ id: 'task-accept', details: 'Medical help needed', seatNumber: 'D01-01', type: 'Medical Emergency' });
    render(<VolunteerTaskStack {...defaultProps} otherTasks={[pending]} onAcceptTask={onAcceptTask} />);
    fireEvent.click(screen.getByRole('button', { name: /accept/i }));
    expect(onAcceptTask).toHaveBeenCalledTimes(1);
    expect(onAcceptTask).toHaveBeenCalledWith('task-accept');
  });

  it('calls onHighlightSeat when a pending task row is clicked', () => {
    const onHighlightSeat = vi.fn();
    const pending = makeTask({ id: 'task-hl', seatNumber: 'A03-07', details: 'Seat issue' });
    render(<VolunteerTaskStack {...defaultProps} otherTasks={[pending]} onHighlightSeat={onHighlightSeat} />);
    fireEvent.click(screen.getByRole('button', { name: /highlight seat a03-07/i }));
    expect(onHighlightSeat).toHaveBeenCalledWith('A03-07');
  });

  it('disables Accept button when volunteer already has an assigned task', () => {
    const assigned = makeTask({ id: 'a1', status: 'accepted', assignedTo: 'VOL-1234' });
    const pending = makeTask({ id: 'p1', details: 'Another task', seatNumber: 'B02-02' });
    render(<VolunteerTaskStack {...defaultProps} myAssignedTasks={[assigned]} otherTasks={[pending]} />);
    expect(screen.getByRole('button', { name: /accept/i })).toBeDisabled();
  });

  it('shows Show on map button on assigned task that calls onHighlightSeat', () => {
    const onHighlightSeat = vi.fn();
    const assigned = makeTask({ id: 'a1', status: 'accepted', seatNumber: 'C10-05', details: 'Urgent delivery' });
    render(<VolunteerTaskStack {...defaultProps} myAssignedTasks={[assigned]} onHighlightSeat={onHighlightSeat} />);
    fireEvent.click(screen.getByText(/show on map/i));
    expect(onHighlightSeat).toHaveBeenCalledWith('C10-05');
  });
});
