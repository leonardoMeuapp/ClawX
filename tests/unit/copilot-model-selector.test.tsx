import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CopilotModelSelector } from '@/components/settings/CopilotModelSelector';

describe('CopilotModelSelector', () => {
  const models = ['gpt-4o', 'gemini-2.0-flash', 'claude-sonnet-4', 'o1-pro'];

  it('renders a flat list of all models without tier grouping or badges', () => {
    render(
      <CopilotModelSelector
        models={models}
        activeModel="gpt-4o"
        onSelectModel={() => {}}
      />,
    );

    expect(screen.getByText('gpt-4o')).toBeDefined();
    expect(screen.getByText('gemini-2.0-flash')).toBeDefined();
    expect(screen.getByText('claude-sonnet-4')).toBeDefined();
    expect(screen.getByText('o1-pro')).toBeDefined();

    expect(screen.queryByText('Free')).toBeNull();
    expect(screen.queryByText('Premium')).toBeNull();
    expect(screen.queryByText('free')).toBeNull();
    expect(screen.queryByText('premium')).toBeNull();
  });

  it('shows a "Models" section header', () => {
    render(
      <CopilotModelSelector
        models={models}
        activeModel="gpt-4o"
        onSelectModel={() => {}}
      />,
    );

    expect(screen.getByText('Models')).toBeDefined();
  });

  it('highlights the active model', () => {
    render(
      <CopilotModelSelector
        models={models}
        activeModel="gpt-4o"
        onSelectModel={() => {}}
      />,
    );

    const activeButton = screen.getByText('gpt-4o').closest('button');
    expect(activeButton?.className).toContain('bg-blue-500/10');
  });

  it('does not highlight non-active models', () => {
    render(
      <CopilotModelSelector
        models={models}
        activeModel="gpt-4o"
        onSelectModel={() => {}}
      />,
    );

    const otherButton = screen.getByText('claude-sonnet-4').closest('button');
    expect(otherButton?.className).not.toContain('bg-blue-500/10');
  });

  it('invokes onSelectModel with the correct model ID when clicked', () => {
    const onSelectModel = vi.fn();

    render(
      <CopilotModelSelector
        models={models}
        activeModel="gpt-4o"
        onSelectModel={onSelectModel}
      />,
    );

    const model = screen.getByText('claude-sonnet-4').closest('button');
    expect(model).toBeDefined();
    fireEvent.click(model!);

    expect(onSelectModel).toHaveBeenCalledTimes(1);
    expect(onSelectModel).toHaveBeenCalledWith('claude-sonnet-4');
  });

  it('does not accept a modelTiers prop', () => {
    const props = {
      models,
      activeModel: 'gpt-4o',
      onSelectModel: () => {},
    };

    const { container } = render(<CopilotModelSelector {...props} />);
    expect(container.querySelectorAll('button')).toHaveLength(models.length);
  });
});
