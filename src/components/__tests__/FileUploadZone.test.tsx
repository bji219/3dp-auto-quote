/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUploadZone from '../FileUploadZone';

// Mock fetch
global.fetch = jest.fn();

describe('FileUploadZone', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dropzone with correct text', () => {
    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} onError={mockOnError} />);

    expect(screen.getByText('Drag & drop your STL file')).toBeInTheDocument();
    expect(screen.getByText('or click to browse')).toBeInTheDocument();
    expect(screen.getByText('Maximum file size: 50MB')).toBeInTheDocument();
  });

  it('calls onError when non-STL file is dropped', async () => {
    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} onError={mockOnError} />);

    const dropzone = screen.getByRole('presentation');
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });

    // Create a mock drop event
    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'text/plain', getAsFile: () => file }],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Only STL files are supported');
    });
  });

  it('calls onError when file is too large', async () => {
    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} onError={mockOnError} />);

    const dropzone = screen.getByRole('presentation');

    // Create a file larger than 50MB
    const largeContent = new ArrayBuffer(51 * 1024 * 1024);
    const file = new File([largeContent], 'large.stl', { type: 'application/sla' });

    Object.defineProperty(file, 'size', { value: 51 * 1024 * 1024 });

    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'application/sla', getAsFile: () => file }],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('File size must be less than 50MB');
    });
  });

  it('uploads valid STL file and calls onUploadComplete', async () => {
    const mockResponse = {
      success: true,
      data: {
        fileId: 'test-file-id',
        fileName: 'model.stl',
        fileSize: 1024,
        stlData: {
          volume: 10.5,
          surfaceArea: 25.3,
          estimatedPrintTime: 2.5,
          triangleCount: 1000,
          boundingBox: { x: 10, y: 10, z: 10 },
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} onError={mockOnError} />);

    const dropzone = screen.getByRole('presentation');
    const file = new File(['test stl content'], 'model.stl', { type: 'application/sla' });

    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'application/sla', getAsFile: () => file }],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    await waitFor(() => {
      expect(mockOnUploadComplete).toHaveBeenCalledWith(mockResponse.data);
    });

    // Verify file info is displayed
    await waitFor(() => {
      expect(screen.getByText('model.stl')).toBeInTheDocument();
    });
  });

  it('shows upload progress during upload', async () => {
    // Delay the response to show progress
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  success: true,
                  data: {
                    fileId: 'test-id',
                    fileName: 'test.stl',
                    fileSize: 100,
                    stlData: { volume: 1, surfaceArea: 1, triangleCount: 10 },
                  },
                }),
              }),
            500
          )
        )
    );

    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} onError={mockOnError} />);

    const dropzone = screen.getByRole('presentation');
    const file = new File(['test'], 'test.stl', { type: 'application/sla' });

    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'application/sla', getAsFile: () => file }],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    // Check that uploading text appears
    await waitFor(() => {
      expect(screen.getByText(/Uploading and analyzing/)).toBeInTheDocument();
    });
  });

  it('handles upload error gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ success: false, message: 'Server error' }),
    });

    render(<FileUploadZone onUploadComplete={mockOnUploadComplete} onError={mockOnError} />);

    const dropzone = screen.getByRole('presentation');
    const file = new File(['test'], 'test.stl', { type: 'application/sla' });

    const dataTransfer = {
      files: [file],
      items: [{ kind: 'file', type: 'application/sla', getAsFile: () => file }],
      types: ['Files'],
    };

    fireEvent.drop(dropzone, { dataTransfer });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Server error');
    });
  });
});
