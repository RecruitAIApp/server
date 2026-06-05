import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyToJobController,
  updateApplicationStageController,
  getApplicationsByJobController,
  retryScreeningController,
} from './applications.controller.js';
import * as applicationService from './applications.service.js';
import { sendResponse } from '../../utils/responseHandler.js';

// Mock the modules
vi.mock('./applications.service.js');
vi.mock('../../utils/responseHandler.js');

describe('Applications Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('applyToJobController', () => {
    it('should successfully submit an application and return 201', async () => {
      const applicationData = { jobId: 'job123', candidateId: 'cand456' };
      mockReq = { body: applicationData };
      const newApplication = { _id: 'app123', ...applicationData };

      vi.mocked(applicationService.applyToJob).mockResolvedValue(newApplication);

      await applyToJobController(mockReq, mockRes);

      expect(applicationService.applyToJob).toHaveBeenCalledWith(applicationData);
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        201,
        true,
        'Application submitted successfully. AI screening is running in the background.',
        newApplication
      );
    });

    it('should handle errors thrown by applicationService.applyToJob with custom status code', async () => {
      mockReq = { body: { jobId: 'job123' } };
      const error = new Error('Job not open');
      error.statusCode = 400;

      vi.mocked(applicationService.applyToJob).mockRejectedValue(error);

      await applyToJobController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not open',
      });
    });

    it('should handle errors without status code by returning 500', async () => {
      mockReq = { body: { jobId: 'job123' } };
      const error = new Error('Database connection failed');

      vi.mocked(applicationService.applyToJob).mockRejectedValue(error);

      await applyToJobController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database connection failed',
      });
    });
  });

  describe('updateApplicationStageController', () => {
    it('should successfully update the application stage and return 200', async () => {
      mockReq = {
        params: { applicationId: 'app123' },
        body: { stage: { key: 'shortlisted' }, notes: 'Good candidate' },
        user: { userId: 'actor789' },
      };
      const updatedApplication = { _id: 'app123', stage: { key: 'shortlisted' } };

      vi.mocked(applicationService.updateApplicationStage).mockResolvedValue(updatedApplication);

      await updateApplicationStageController(mockReq, mockRes);

      expect(applicationService.updateApplicationStage).toHaveBeenCalledWith('app123', {
        stage: { key: 'shortlisted' },
        notes: 'Good candidate',
        actorId: 'actor789',
      });
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'Application stage updated successfully',
        updatedApplication
      );
    });

    it('should handle errors during stage update', async () => {
      mockReq = {
        params: { applicationId: 'app123' },
        body: { stage: { key: 'invalid_stage' } },
        user: { userId: 'actor789' },
      };
      const error = new Error('Invalid stage');
      error.statusCode = 400;

      vi.mocked(applicationService.updateApplicationStage).mockRejectedValue(error);

      await updateApplicationStageController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid stage',
      });
    });
  });

  describe('getApplicationsByJobController', () => {
    it('should fetch applications with provided page and limit and return 200', async () => {
      mockReq = {
        params: { id: 'job123' },
        job: { company: 'company456' },
        query: { page: '2', limit: '10' },
      };
      const applicationsData = { docs: [], totalDocs: 0 };

      vi.mocked(applicationService.getApplicationsByJob).mockResolvedValue(applicationsData);

      await getApplicationsByJobController(mockReq, mockRes);

      expect(applicationService.getApplicationsByJob).toHaveBeenCalledWith(
        'job123',
        'company456',
        { page: 2, limit: 10 }
      );
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'Applications fetched successfully',
        applicationsData
      );
    });

    it('should fetch applications with default page and limit if not provided', async () => {
      mockReq = {
        params: { id: 'job123' },
        job: { company: 'company456' },
        query: {},
      };
      const applicationsData = { docs: [], totalDocs: 0 };

      vi.mocked(applicationService.getApplicationsByJob).mockResolvedValue(applicationsData);

      await getApplicationsByJobController(mockReq, mockRes);

      expect(applicationService.getApplicationsByJob).toHaveBeenCalledWith(
        'job123',
        'company456',
        { page: 1, limit: 20 }
      );
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'Applications fetched successfully',
        applicationsData
      );
    });

    it('should handle errors when fetching applications', async () => {
      mockReq = {
        params: { id: 'job123' },
        job: { company: 'company456' },
        query: {},
      };
      const error = new Error('Job not found');
      error.statusCode = 404;

      vi.mocked(applicationService.getApplicationsByJob).mockRejectedValue(error);

      await getApplicationsByJobController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found',
      });
    });
  });

  describe('retryScreeningController', () => {
    it('should successfully retry screening and return 200', async () => {
      mockReq = {
        params: { applicationId: 'app123' },
        user: { id: 'user789' },
      };
      const updatedApplication = { _id: 'app123', aiScreening: { status: 'queued' } };

      vi.mocked(applicationService.retryScreening).mockResolvedValue(updatedApplication);

      await retryScreeningController(mockReq, mockRes);

      expect(applicationService.retryScreening).toHaveBeenCalledWith('app123', 'user789');
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'AI screening enqueued successfully',
        updatedApplication
      );
    });

    it('should handle errors when retrying screening', async () => {
      mockReq = {
        params: { applicationId: 'app123' },
        user: { id: 'user789' },
      };
      const error = new Error('Forbidden');
      error.statusCode = 403;

      vi.mocked(applicationService.retryScreening).mockRejectedValue(error);

      await retryScreeningController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden',
      });
    });
  });
});
