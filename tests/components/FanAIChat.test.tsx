// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// jsdom does not implement scrollIntoView — stub it globally
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock sendAICommand from apiClient
vi.mock('../../src/services/apiClient', () => ({
  sendAICommand: vi.fn(),
}));

// Mock firebase (apiClient imports firebase indirectly)
vi.mock('../../src/firebase', () => ({
  auth: { currentUser: null },
  appCheck: null,
  db: {},
}));

vi.mock('../../src/services/dataSource', () => ({
  isDemoModeActive: vi.fn(() => false),
}));

vi.mock('../../src/services/demoStore', () => ({
  getDemoDocs: vi.fn(() => []),
}));

const { sendAICommand } = await import('../../src/services/apiClient');
const { default: FanAIChat } = await import('../../src/components/fan/FanAIChat');

const mockSendAICommand = sendAICommand as ReturnType<typeof vi.fn>;

describe('FanAIChat', () => {
  const defaultChatLogs = [
    { sender: 'ai' as const, text: "Hi! I'm Nexus AI. How can I help?" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendAICommand.mockResolvedValue({ response: 'The food court is on Level 2.', source: 'ai' });
  });

  it('renders correctly with initial chat logs', () => {
    render(<FanAIChat chatLogs={defaultChatLogs} onAppendMessage={vi.fn()} />);
    expect(screen.getByText('Nexus AI Assistant')).toBeInTheDocument();
    expect(screen.getByText("Hi! I'm Nexus AI. How can I help?")).toBeInTheDocument();
  });

  it('renders quick query buttons', () => {
    render(<FanAIChat chatLogs={defaultChatLogs} onAppendMessage={vi.fn()} />);
    expect(screen.getByText('Where is the nearest food court?')).toBeInTheDocument();
    expect(screen.getByText('Where is the nearest washroom?')).toBeInTheDocument();
  });

  it('renders with empty chat logs', () => {
    render(<FanAIChat chatLogs={[]} onAppendMessage={vi.fn()} />);
    expect(screen.getByText('Nexus AI Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask AI assistant...')).toBeInTheDocument();
  });

  it('renders multiple messages correctly', () => {
    const logs = [
      { sender: 'user' as const, text: 'Where is the washroom?' },
      { sender: 'ai' as const, text: 'The washroom is on Level 1.' },
    ];
    render(<FanAIChat chatLogs={logs} onAppendMessage={vi.fn()} />);
    expect(screen.getByText('Where is the washroom?')).toBeInTheDocument();
    expect(screen.getByText('The washroom is on Level 1.')).toBeInTheDocument();
  });

  it('calls onAppendMessage with user message on form submit', async () => {
    const onAppendMessage = vi.fn();
    render(<FanAIChat chatLogs={defaultChatLogs} onAppendMessage={onAppendMessage} />);

    const input = screen.getByPlaceholderText('Ask AI assistant...');
    fireEvent.change(input, { target: { value: 'Where is Gate C?' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    expect(onAppendMessage).toHaveBeenCalledWith({ sender: 'user', text: 'Where is Gate C?' });
  });

  it('calls sendAICommand when message is submitted', async () => {
    const onAppendMessage = vi.fn();
    render(<FanAIChat chatLogs={defaultChatLogs} onAppendMessage={onAppendMessage} />);

    const input = screen.getByPlaceholderText('Ask AI assistant...');
    fireEvent.change(input, { target: { value: 'Hello AI' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    expect(mockSendAICommand).toHaveBeenCalledWith('Hello AI');
  });

  it('appends AI response to chat after sendAICommand resolves', async () => {
    const onAppendMessage = vi.fn();
    render(<FanAIChat chatLogs={defaultChatLogs} onAppendMessage={onAppendMessage} />);

    const input = screen.getByPlaceholderText('Ask AI assistant...');
    fireEvent.change(input, { target: { value: 'food court location?' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    expect(onAppendMessage).toHaveBeenCalledWith({ sender: 'ai', text: 'The food court is on Level 2.' });
  });

  it('calls onAppendMessage with error text when sendAICommand rejects', async () => {
    mockSendAICommand.mockRejectedValueOnce(new Error('Network error'));
    const onAppendMessage = vi.fn();
    render(<FanAIChat chatLogs={defaultChatLogs} onAppendMessage={onAppendMessage} />);

    const input = screen.getByPlaceholderText('Ask AI assistant...');
    fireEvent.change(input, { target: { value: 'test error' } });

    await act(async () => {
      fireEvent.submit(input.closest('form')!);
    });

    expect(onAppendMessage).toHaveBeenCalledWith({
      sender: 'ai',
      text: 'Error communicating with operational intelligence.',
    });
  });

  it('calls onAppendMessage when quick query button is clicked', async () => {
    const onAppendMessage = vi.fn();
    render(<FanAIChat chatLogs={defaultChatLogs} onAppendMessage={onAppendMessage} />);

    await act(async () => {
      fireEvent.click(screen.getByText('Where is the nearest food court?'));
    });

    expect(onAppendMessage).toHaveBeenCalledWith({
      sender: 'user',
      text: 'Where is the nearest food court?',
    });
  });
});
