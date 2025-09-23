import React, { useState, useEffect } from 'react';
import { templateService } from '../services/api';
import { Palette, Download, Eye, Zap } from 'lucide-react';

const ResumeDesigner = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [resumeData, setResumeData] = useState({
    personalInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: '',
      summary: ''
    },
    experience: [
      {
        title: '',
        company: '',
        duration: '',
        description: ''
      }
    ],
    education: [
      {
        degree: '',
        school: '',
        year: '',
        gpa: ''
      }
    ],
    skills: [],
    projects: [
      {
        name: '',
        description: '',
        technologies: ''
      }
    ]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const data = await templateService.getTemplates();
        setTemplates(data.templates);
        setSelectedTemplate(data.templates[0]);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const handleInputChange = (section, field, value, index = null) => {
    setResumeData(prev => {
      const newData = { ...prev };
      
      if (index !== null) {
        newData[section][index][field] = value;
      } else if (section === 'skills') {
        newData[section] = value.split(',').map(skill => skill.trim()).filter(skill => skill);
      } else {
        newData[section][field] = value;
      }
      
      return newData;
    });
  };

  const addSection = (section) => {
    setResumeData(prev => {
      const newData = { ...prev };
      
      if (section === 'experience') {
        newData.experience.push({
          title: '',
          company: '',
          duration: '',
          description: ''
        });
      } else if (section === 'education') {
        newData.education.push({
          degree: '',
          school: '',
          year: '',
          gpa: ''
        });
      } else if (section === 'projects') {
        newData.projects.push({
          name: '',
          description: '',
          technologies: ''
        });
      }
      
      return newData;
    });
  };

  const removeSection = (section, index) => {
    setResumeData(prev => {
      const newData = { ...prev };
      newData[section].splice(index, 1);
      return newData;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
            <div className="grid lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Resume Designer</h1>
          <p className="text-gray-600">Create a professional resume with our AI-powered templates</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Template Selection */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Template</h2>
            <div className="space-y-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`cursor-pointer rounded-xl overflow-hidden transition-all duration-200 ${
                    selectedTemplate?.id === template.id
                      ? 'ring-2 ring-blue-500 shadow-lg scale-105'
                      : 'hover:shadow-md'
                  }`}
                >
                  <img
                    src={template.preview}
                    alt={template.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4 bg-white">
                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {template.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Resume Information</h2>
              
              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={resumeData.personalInfo.fullName}
                    onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={resumeData.personalInfo.email}
                    onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={resumeData.personalInfo.phone}
                    onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    placeholder="Location"
                    value={resumeData.personalInfo.location}
                    onChange={(e) => handleInputChange('personalInfo', 'location', e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <textarea
                  placeholder="Professional Summary"
                  value={resumeData.personalInfo.summary}
                  onChange={(e) => handleInputChange('personalInfo', 'summary', e.target.value)}
                  rows={3}
                  className="mt-4 w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Experience */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Experience</h3>
                  <button
                    onClick={() => addSection('experience')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Experience
                  </button>
                </div>
                {resumeData.experience.map((exp, index) => (
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <input
                        type="text"
                        placeholder="Job Title"
                        value={exp.title}
                        onChange={(e) => handleInputChange('experience', 'title', e.target.value, index)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Company"
                        value={exp.company}
                        onChange={(e) => handleInputChange('experience', 'company', e.target.value, index)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Duration (e.g., Jan 2020 - Present)"
                      value={exp.duration}
                      onChange={(e) => handleInputChange('experience', 'duration', e.target.value, index)}
                      className="w-full mb-4 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <textarea
                      placeholder="Job Description"
                      value={exp.description}
                      onChange={(e) => handleInputChange('experience', 'description', e.target.value, index)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {resumeData.experience.length > 1 && (
                      <button
                        onClick={() => removeSection('experience', index)}
                        className="mt-2 text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Skills</h3>
                <input
                  type="text"
                  placeholder="Enter skills separated by commas (e.g., JavaScript, React, Node.js)"
                  value={resumeData.skills.join(', ')}
                  onChange={(e) => handleInputChange('skills', null, e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Education */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Education</h3>
                  <button
                    onClick={() => addSection('education')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Education
                  </button>
                </div>
                {resumeData.education.map((edu, index) => (
                  <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Degree"
                        value={edu.degree}
                        onChange={(e) => handleInputChange('education', 'degree', e.target.value, index)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="School"
                        value={edu.school}
                        onChange={(e) => handleInputChange('education', 'school', e.target.value, index)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Year"
                        value={edu.year}
                        onChange={(e) => handleInputChange('education', 'year', e.target.value, index)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="GPA (optional)"
                        value={edu.gpa}
                        onChange={(e) => handleInputChange('education', 'gpa', e.target.value, index)}
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    {resumeData.education.length > 1 && (
                      <button
                        onClick={() => removeSection('education', index)}
                        className="mt-2 text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Preview</h2>
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900">{resumeData.personalInfo.fullName || 'Your Name'}</h3>
                  <p className="text-gray-600">{resumeData.personalInfo.email}</p>
                  <p className="text-gray-600">{resumeData.personalInfo.phone}</p>
                  <p className="text-gray-600">{resumeData.personalInfo.location}</p>
                </div>
                
                {resumeData.personalInfo.summary && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                    <p className="text-sm text-gray-700">{resumeData.personalInfo.summary}</p>
                  </div>
                )}
                
                {resumeData.experience.some(exp => exp.title) && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Experience</h4>
                    {resumeData.experience.filter(exp => exp.title).map((exp, index) => (
                      <div key={index} className="mb-3">
                        <h5 className="font-medium text-gray-900">{exp.title}</h5>
                        <p className="text-sm text-gray-600">{exp.company} • {exp.duration}</p>
                        {exp.description && <p className="text-sm text-gray-700 mt-1">{exp.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
                
                {resumeData.skills.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {resumeData.skills.map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {resumeData.education.some(edu => edu.degree) && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Education</h4>
                    {resumeData.education.filter(edu => edu.degree).map((edu, index) => (
                      <div key={index} className="mb-2">
                        <h5 className="font-medium text-gray-900">{edu.degree}</h5>
                        <p className="text-sm text-gray-600">{edu.school} • {edu.year}</p>
                        {edu.gpa && <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-6 space-y-3">
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center space-x-2">
                  <Eye className="w-5 h-5" />
                  <span>Preview Full Resume</span>
                </button>
                <button className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Download PDF</span>
                </button>
                <button className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>AI Enhance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeDesigner;