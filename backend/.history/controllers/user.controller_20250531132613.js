import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDataUri from "../utils/datauri.js";
import cloudinary from "../utils/cloudinary.js";

export const register = async (req, res) => {
  try {
    const { fullname, email, phoneNumber, password, role } = req.body;

    if (!fullname || !email || !phoneNumber || !password || !role) {
      return res.status(400).json({
        message: "Something is missing",
        success: false
      });
    };
    const file = req.file;
    const fileUri = getDataUri(file);
    const cloudResponse = await cloudinary.uploader.upload(fileUri.content);

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        message: 'User already exist with this email.',
        success: false,
      })
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullname,
      email,
      phoneNumber,
      password: hashedPassword,
      role,
      profile: {
        profilePhoto: cloudResponse.secure_url,
      }
    });

    return res.status(201).json({
      message: "Account created successfully.",
      success: true
    });
  } catch (error) {
    console.log(error);
  }
}
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Something is missing",
        success: false
      });
    };
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "Incorrect email or password.",
        success: false,
      })
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        message: "Incorrect email or password.",
        success: false,
      })
    };
    // check role is correct or not
    if (role !== user.role) {
      return res.status(400).json({
        message: "Account doesn't exist with current role.",
        success: false
      })
    };

    const tokenData = {
      userId: user._id
    }
    const token = await jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

    user = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile
    }

    return res.status(200).cookie("token", token, { maxAge: 1 * 24 * 60 * 60 * 1000, httpsOnly: true, sameSite: 'strict' }).json({
      message: `Welcome back ${user.fullname}`,
      user,
      success: true
    })
  } catch (error) {
    console.log(error);
  }
}
// Get all liked jobs for logged-in user
// export const getLikedJobs = async (req, res) => {
//   try {
//     const user = await User.findById(req.id).populate("likedJobs");
//     res.status(200).json({ jobs: user.likedJobs, success: true });
//   } catch (err) {
//     res.status(500).json({ message: "Failed to fetch liked jobs", success: false });
//   }
// };

export const getLikedJobs = async (req, res) => {
  try {
    const user = await User.findById(req.id).populate("likedJobs");
    res.status(200).json({ jobs: user.likedJobs, success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch liked jobs", success: false });
  }
};

// Like a job
export const likeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { likedJobs: jobId } }, // Prevents duplicates
      { new: true }
    );

    res.status(200).json({ 
      message: "Job saved successfully", 
      likedJobs: user.likedJobs,
      success: true 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to save job", 
      success: false 
    });
  }
};

// Unlike a job
export const unlikeJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { likedJobs: jobId } },
      { new: true }
    );

    res.status(200).json({ 
      message: "Job removed from saved", 
      likedJobs: user.likedJobs,
      success: true 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Failed to remove job", 
      success: false 
    });
  }
};

export const logout = async (req, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully.",
      success: true
    })
  } catch (error) {
    console.log(error);
  }
}


// export const updateProfile = async (req, res) => {
//   try {
//     const { fullname, email, phoneNumber, bio, skills } = req.body;
//     const resumeFile = req.files?.resume?.[0];
//     const profilePhotoFile = req.files?.file?.[0];

//     const userId = req.id;
//     let user = await User.findById(userId);

//     if (!user) {
//       return res.status(400).json({
//         message: "User not found.",
//         success: false
//       });
//     }

//     // Process resume if uploaded
//     if (resumeFile) {
//       const resumeUri = getDataUri(resumeFile);
//       const resumeUpload = await cloudinary.uploader.upload(resumeUri.content, {
//         resource_type: "raw",
//         folder: "resumes",
//         public_id: `resume_${userId}_${Date.now()}`,
//         context: `filename=${resumeFile.originalname}`
//       });

//       user.profile.resume = resumeUpload.secure_url;
//       user.profile.resumeOriginalName = resumeFile.originalname;
//     }

//     // Process profile photo if uploaded
//     if (profilePhotoFile) {
//       const fileUri = getDataUri(profilePhotoFile);
//       const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
//       user.profile.profilePhoto = cloudResponse.secure_url;
//     }

//     // Update other fields
//     if (fullname) user.fullname = fullname;
//     if (email) user.email = email;
//     if (phoneNumber) user.phoneNumber = phoneNumber;
//     if (bio) user.profile.bio = bio;
//     if (skills) {
//       user.profile.skills = skills.split(',').map(skill => skill.trim()).filter(Boolean);
//     }

//     await user.save();

//     const updatedUser = {
//       _id: user._id,
//       fullname: user.fullname,
//       email: user.email,
//       phoneNumber: user.phoneNumber,
//       role: user.role,
//       profile: user.profile
//     };

//     return res.status(200).json({
//       message: "Profile updated successfully.",
//       user: updatedUser,
//       success: true
//     });
//   } catch (error) {
//     console.error("Update profile error:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       success: false
//     });
//   }
// };



export const updateProfile = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);

    const userId = req.id;
    let user = await User.findById(userId);

    if (!user) {
      return res.status(400).json({
        message: "User not found.",
        success: false
      });
    }

    // Handle profile photo upload if exists
    if (req.files?.file) {
      const profilePhotoFile = req.files.file[0];
      const fileUri = getDataUri(profilePhotoFile);
      const cloudResponse = await cloudinary.uploader.upload(fileUri.content);
      user.profile.profilePhoto = cloudResponse.secure_url;
    }

    // Update text fields from request body
    const { fullname, email, phoneNumber, bio, skills, resume, resumeName } = req.body;

    console.log('Received resume fields:', {
      resume,
      resumeName
    });

    if (fullname) user.fullname = fullname;
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (bio) user.profile.bio = bio;
    if (skills) {
      user.profile.skills = skills.split(',').map(skill => skill.trim()).filter(Boolean);
    }

    // Update resume fields if provided
    if (resume !== undefined) {
      user.profile.resume = resume || null;
      user.profile.resumeName = resumeName || "Resume";
    }

    await user.save();

    const updatedUser = {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      profile: user.profile
    };

    return res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUser,
      success: true
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      message: "Internal server error",
      success: false
    });
  }
};