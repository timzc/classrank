import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DailyDetails } from '@/components/dashboard/daily-details';
import { AcademicYearProvider } from '@/components/layout/academic-year-switcher';
import { recordsApi } from '@/lib/api/records';

vi.mock('@/lib/api/records', () => ({
  recordsApi: {
    dailyDetails: vi.fn(),
    update: vi.fn(),
    removeByDate: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const dailyDetailsMock = vi.mocked(recordsApi.dailyDetails);
const updateMock = vi.mocked(recordsApi.update);

function renderDetails() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AcademicYearProvider>
        <DailyDetails dates={['2026-06-10']} />
      </AcademicYearProvider>
    </QueryClientProvider>,
  );
}

async function expandRow() {
  fireEvent.click(screen.getByText('2026-06-10'));
  await screen.findByText('沈允姶');
}

describe('DailyDetails 学生姓名编辑', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dailyDetailsMock.mockResolvedValue({
      date: '2026-06-10',
      records: [
        {
          student_id: 1,
          student_name: '沈允姶',
          is_focused: false,
          bonus: [{ id: 11, item: '获得优胜班级', score: 3 }],
          penalty: [{ id: 12, item: '迟到', score: 1 }],
          net_score: 2,
        },
      ],
    });
    updateMock.mockResolvedValue({ success: true });
  });

  it('点击编辑按钮后回车，对该学生当日每条记录调用 update 并带上原字段', async () => {
    renderDetails();
    await expandRow();

    fireEvent.click(screen.getByLabelText('修改姓名'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '沈允怡' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(updateMock).toHaveBeenCalledTimes(2));
    expect(updateMock).toHaveBeenCalledWith(11, {
      student_name: '沈允怡',
      item: '获得优胜班级',
      score: 3,
      type: 'bonus',
    });
    expect(updateMock).toHaveBeenCalledWith(12, {
      student_name: '沈允怡',
      item: '迟到',
      score: 1,
      type: 'penalty',
    });
  });

  it('按 Esc 取消编辑，不调用 update', async () => {
    renderDetails();
    await expandRow();

    fireEvent.click(screen.getByLabelText('修改姓名'));
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '沈允怡' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(updateMock).not.toHaveBeenCalled();
    expect(screen.getByText('沈允姶')).toBeInTheDocument();
  });

  it('姓名为空或未变化时不调用 update', async () => {
    renderDetails();
    await expandRow();

    fireEvent.click(screen.getByLabelText('修改姓名'));
    let input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(updateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('修改姓名'));
    input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '沈允姶' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(updateMock).not.toHaveBeenCalled();
  });
});
