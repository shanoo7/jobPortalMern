import { Application } from "../models/application.model.js";
import { Job } from "../models/job.model.js";


// APPLY FOR A JOB
export const applyJob = async (req, res) => {
  try {
    const userId = req.id;
    const jobId = req.params.id;
    if (!jobId) {
      return res.status(400).json({
        message: "Job id is required.",
        success: false
      })
    };
    // check if the user has already applied for the job
    const existingApplication = await Application.findOne({ job: jobId, applicant: userId });

    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this jobs",
        success: false
      });
    }

    // check if the jobs exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        message: "Job not found",
        success: false
      })
    }
    // create a new application
    const newApplication = await Application.create({
      job: jobId,
      applicant: userId,
    });

    job.applications.push(newApplication._id);
    await job.save();
    return res.status(201).json({
      message: "Job applied successfully.",
      success: true
    })
  } catch (error) {

    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      // error: error.message,
      success: false,
    });
  }
};


// GET ALL APPLIED JOBS BY USER 
export const getAppliedJobs = async (req, res) => {
  try {
    const userId = req.id;
    const application = await Application.find({ applicant: userId }).sort({ createdAt: -1 }).populate({
      path: 'job',
      options: { sort: { createdAt: -1 } },
      populate: {
        path: 'company',
        options: { sort: { createdAt: -1 } },
      }
    });
    if (!application) {
      return res.status(404).json({
        message: "No Applications",
        success: false
      })
    };
    return res.status(200).json({
      application,
      success: true
    })
  } catch (error) {

    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      // error: error.message,
      success: false,
    });
  }
}


// GET ALL APPLICANTS FOR A SPECIFIC JOB 
export const getApplicants = async (req, res) => {
  try {
    const jobId = req.params.id;

    const applications = await Application.find({ job: jobId })
      .populate({
        path: 'applicant',
        select: 'fullname email profile',
        model: 'User'
      })
      .populate({
        path: 'job',
        select: 'title',
        model: 'Job'
      });

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {

    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      // error: error.message,
      success: false,
    });
  }
};


//  UPDATE APPLICATION STATUS  
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const applicationId = req.params.id;
    if (!status) {
      return res.status(400).json({
        message: 'status is required',
        success: false
      })
    };

    // find the application by applicantion id
    const application = await Application.findOne({ _id: applicationId });
    if (!application) {
      return res.status(404).json({
        message: "Application not found.",
        success: false
      })
    };

    // update the status
    application.status = status.toLowerCase();
    await application.save();

    return res.status(200).json({
      message: "Status updated successfully.",
      success: true
    });

  } catch (error) {

    return res.status(500).json({
      message: "Something went wrong. Please try again later.",
      // error: error.message,
      success: false,
    });
  }
}

//get job by id
export const getJobById = async (req, res) => {
  try {
    const jobId = req.params.id;

    const job = await Job.findById(jobId).populate({
      path: 'applications',
      populate: {
        path: 'applicant',
        select: 'fullname email profile'
      }
    });

    if (!job) {
      return res.status(404).json({ message: "Job not found", success: false });
    }

    return res.status(200).json({ job, success: true });
  } catch (error) {
    // console.error("Error in getJobById:", error);
    return res.status(500).json({ message: "Internal server error", success: false });
  }
};


// GET ALL APPLICATIONS BY STUDENT
export const getStudentApplications = async (req, res) => {
  try {
    const studentId = req.id; // Auth middleware से student ID लें

    const applications = await Application.find({ applicant: studentId })
      .populate({
        path: 'job',
        select: 'title company salary location',
        populate: {
          path: 'company',
          select: 'name logo_url'
        }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      applications
    });

  } catch (error) {
    // console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch applications"
    });
  }
};