import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  applyToJobController,
  updateApplicationStageController,
  getApplicationsByJobController,
  retryScreeningController,
  getApplicationDetailsController,
  getJobKanbanController,
  addApplicationNoteController,
  getCandidateApplicationsController,
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

  describe('getApplicationDetailsController', () => {
    it('should successfully get application details and return 200', async () => {
      mockReq = {
        params: { applicationId: 'app123' },
        user: { id: 'user789', role: 'candidate' },
      };
      const applicationDetails = { _id: 'app123', candidateId: 'user789', companyId: 'comp999' };

      vi.mocked(applicationService.getApplicationDetails).mockResolvedValue(applicationDetails);

      await getApplicationDetailsController(mockReq, mockRes);

      expect(applicationService.getApplicationDetails).toHaveBeenCalledWith('app123', mockReq.user);
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'Application details fetched successfully',
        applicationDetails
      );
    });

    it('should handle errors when getting application details', async () => {
      mockReq = {
        params: { applicationId: 'app123' },
        user: { id: 'user789', role: 'candidate' },
      };
      const error = new Error('Forbidden');
      error.statusCode = 403;

      vi.mocked(applicationService.getApplicationDetails).mockRejectedValue(error);

      await getApplicationDetailsController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden',
      });
    });
  });

  describe('getJobKanbanController', () => {
    it('should successfully fetch job Kanban and return 200', async () => {
      mockReq = {
        params: { id: 'job123' },
        job: { company: 'company456' },
      };
      const kanbanData = { applied: [], shortlisted: [] };

      vi.mocked(applicationService.getJobKanban).mockResolvedValue(kanbanData);

      await getJobKanbanController(mockReq, mockRes);

      expect(applicationService.getJobKanban).toHaveBeenCalledWith('job123', 'company456');
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'Job Kanban fetched successfully',
        kanbanData
      );
    });

    it('should handle errors when fetching job Kanban', async () => {
      mockReq = {
        params: { id: 'job123' },
        job: { company: 'company456' },
      };
      const error = new Error('Job not found');
      error.statusCode = 404;

      vi.mocked(applicationService.getJobKanban).mockRejectedValue(error);

      await getJobKanbanController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Job not found',
      });
    });
  });

  describe('addApplicationNoteController', () => {
    it('should successfully add note/rating and return 200', async () => {
      mockReq = {
        params: { id: 'app123' },
        body: { content: 'Excellent candidate', ratingScore: 5 },
        user: { id: 'recruiter789' },
      };
      const updatedApplication = { _id: 'app123', notes: [{ content: 'Excellent candidate' }] };

      vi.mocked(applicationService.addApplicationNote).mockResolvedValue(updatedApplication);

      await addApplicationNoteController(mockReq, mockRes);

      expect(applicationService.addApplicationNote).toHaveBeenCalledWith('app123', mockReq.body, mockReq.user);
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'Note added successfully',
        updatedApplication
      );
    });

    it('should handle errors when adding note/rating', async () => {
      mockReq = {
        params: { id: 'app123' },
        body: { content: 'Excellent candidate', ratingScore: 5 },
        user: { id: 'recruiter789' },
      };
      const error = new Error('Forbidden');
      error.statusCode = 403;

      vi.mocked(applicationService.addApplicationNote).mockRejectedValue(error);

      await addApplicationNoteController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Forbidden',
      });
    });
  });

  describe('getCandidateApplicationsController', () => {
    it('should successfully fetch candidate applications and return 200', async () => {
      mockReq = {
        user: { id: 'candidate123' },
      };
      const applicationsList = [{ _id: 'app1' }, { _id: 'app2' }];

      vi.mocked(applicationService.getCandidateApplications).mockResolvedValue(applicationsList);

      await getCandidateApplicationsController(mockReq, mockRes);

      expect(applicationService.getCandidateApplications).toHaveBeenCalledWith('candidate123');
      expect(sendResponse).toHaveBeenCalledWith(
        mockRes,
        200,
        true,
        'My applications fetched successfully',
        applicationsList
      );
    });

    it('should handle errors when fetching candidate applications', async () => {
      mockReq = {
        user: { id: 'candidate123' },
      };
      const error = new Error('Database error');
      error.statusCode = 500;

      vi.mocked(applicationService.getCandidateApplications).mockRejectedValue(error);

      await getCandidateApplicationsController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Database error',
      });
    });
  });
});
