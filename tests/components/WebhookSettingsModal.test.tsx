// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── framer-motion ─────────────────────────────────────────────────────────────
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

// ── useModalA11y — returns a stable ref so the motion.div ref prop doesn't crash ─
vi.mock('../../src/hooks/useModalA11y', () => ({
  useModalA11y: () => ({ current: null }),
}));

// ── authedFetch — mock the API layer ──────────────────────────────────────────
const mockAuthedFetch = vi.fn();
vi.mock('../../src/services/apiClient', () => ({
  authedFetch: (...args: unknown[]) => mockAuthedFetch(...args),
}));

const { default: WebhookSettingsModal } = await import('../../src/components/WebhookSettingsModal');

const baseProps = { isOpen: true, onClose: vi.fn(), onSave: vi.fn() };

/** Helper: make authedFetch return a successful GET config response. */
function mockGetConfig(config = { n8nWebhookUrl: '', n8nAiAssistantUrl: '', useMockAI: true }) {
  mockAuthedFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => config,
  });
}

/** Helper: make authedFetch return a successful POST save response. */
function mockSaveSuccess(config = { n8nWebhookUrl: 'https://n8n.test/', n8nAiAssistantUrl: '', useMockAI: true }) {
  mockAuthedFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ message: 'ok', config }),
  });
}

describe('WebhookSettingsModal — closed state', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders nothing when isOpen is false', () => {
    mockAuthedFetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    render(<WebhookSettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('WebhookSettingsModal — open state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig();
  });

  it('renders the dialog with correct role and aria attributes', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'webhook-settings-title');
  });

  it('renders the Integration Center heading', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => expect(screen.getByText('Nexus AI Integration Center')).toBeInTheDocument());
  });

  it('renders the n8n dispatch URL input', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => expect(screen.getByLabelText(/n8n Dispatch Orchestration Webhook/i)).toBeInTheDocument());
  });

  it('renders the n8n AI assistant URL input', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => expect(screen.getByLabelText(/n8n AI Command Assistant Webhook/i)).toBeInTheDocument());
  });

  it('renders the Save Settings and Cancel buttons', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save Settings/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    });
  });

  it('calls onClose when the close (X) button is clicked', async () => {
    const onClose = vi.fn();
    render(<WebhookSettingsModal {...baseProps} onClose={onClose} />);
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByLabelText('Close settings'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(<WebhookSettingsModal {...baseProps} onClose={onClose} />);
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('populates inputs with loaded config values', async () => {
    mockAuthedFetch.mockReset();
    mockGetConfig({ n8nWebhookUrl: 'https://hook.test/', n8nAiAssistantUrl: 'https://ai.test/', useMockAI: false });
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => expect(screen.getByDisplayValue('https://hook.test/')).toBeInTheDocument());
    expect(screen.getByDisplayValue('https://ai.test/')).toBeInTheDocument();
  });

  it('shows an error alert when the GET config request fails', async () => {
    mockAuthedFetch.mockReset();
    mockAuthedFetch.mockRejectedValueOnce(new Error('network error'));
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/Failed to load server configuration/i);
  });
});

describe('WebhookSettingsModal — save interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig();
  });

  it('shows success status after a successful save', async () => {
    mockSaveSuccess();
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => screen.getByRole('button', { name: /Save Settings/i }));
    fireEvent.submit(screen.getByRole('button', { name: /Save Settings/i }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveTextContent(/updated successfully/i);
  });

  it('calls onSave callback with the returned config on success', async () => {
    const onSave = vi.fn();
    const savedConfig = { n8nWebhookUrl: 'https://hook.test/', n8nAiAssistantUrl: '', useMockAI: true };
    mockSaveSuccess(savedConfig);
    render(<WebhookSettingsModal {...baseProps} onSave={onSave} />);
    await waitFor(() => screen.getByRole('button', { name: /Save Settings/i }));
    fireEvent.submit(screen.getByRole('button', { name: /Save Settings/i }).closest('form')!);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(savedConfig));
  });

  it('shows error alert when save request fails', async () => {
    mockAuthedFetch.mockReset();
    mockGetConfig();
    mockAuthedFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => screen.getByRole('button', { name: /Save Settings/i }));
    fireEvent.submit(screen.getByRole('button', { name: /Save Settings/i }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/Error saving configuration/i);
  });

  it('disables the Save button while saving', async () => {
    // Make save take a while to resolve so we can check disabled state
    mockAuthedFetch.mockReset();
    mockGetConfig();
    mockAuthedFetch.mockImplementationOnce(() => new Promise(() => {})); // never resolves
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => screen.getByRole('button', { name: /Save Settings/i }));
    fireEvent.submit(screen.getByRole('button', { name: /Save Settings/i }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('button', { name: /Saving/i })).toBeDisabled());
  });

  it('toggles useMockAI when the toggle button is clicked', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => screen.getByRole('dialog'));
    const toggle = screen.getByRole('button', { name: /Disable rule-based fallback/i });
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Enable rule-based fallback/i })).toHaveAttribute('aria-pressed', 'false');
  });

  it('updates the dispatch URL field when the user types in it', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => screen.getByRole('dialog'));
    const dispatchInput = screen.getByLabelText(/n8n Dispatch Orchestration Webhook/i);
    fireEvent.change(dispatchInput, { target: { value: 'https://hook.example.com/dispatch' } });
    expect(dispatchInput).toHaveValue('https://hook.example.com/dispatch');
  });

  it('updates the AI assistant URL field when the user types in it', async () => {
    render(<WebhookSettingsModal {...baseProps} />);
    await waitFor(() => screen.getByRole('dialog'));
    const aiInput = screen.getByLabelText(/n8n AI Command Assistant Webhook/i);
    fireEvent.change(aiInput, { target: { value: 'https://ai.example.com/webhook' } });
    expect(aiInput).toHaveValue('https://ai.example.com/webhook');
  });

  it('calls onClose after the 1.5s close-delay following a successful save', async () => {
    // Spy on setTimeout so we can fire the callback immediately
    const pendingCallbacks: Array<() => void> = [];
    const realSetTimeout = globalThis.setTimeout.bind(globalThis);
    const setTimeoutSpy = vi
      .spyOn(globalThis, 'setTimeout')
      .mockImplementation((cb: (...args: unknown[]) => void, ms?: number, ...args: unknown[]) => {
        if (ms === 1500) {
          pendingCallbacks.push(() => cb(...args));
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }
        return realSetTimeout(cb as () => void, ms, ...args);
      });

    const onClose = vi.fn();
    mockAuthedFetch.mockReset();
    mockGetConfig();
    mockSaveSuccess();

    render(<WebhookSettingsModal isOpen={true} onClose={onClose} onSave={vi.fn()} />);
    await waitFor(() => screen.getByRole('button', { name: /Save Settings/i }));

    fireEvent.submit(
      screen.getByRole('button', { name: /Save Settings/i }).closest('form')!
    );

    // Wait for success message to appear (confirms save resolved)
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());

    // The 1.5 s callback should be registered by now — fire it
    expect(pendingCallbacks.length).toBeGreaterThan(0);
    pendingCallbacks.forEach(cb => cb());
    expect(onClose).toHaveBeenCalledTimes(1);

    setTimeoutSpy.mockRestore();
  });
});
