import React, { useState, useEffect, useRef } from 'react';
import { templateService } from '../services/api';
import { Palette, Download, Eye, Zap } from 'lucide-react';
import Modal from 'react-modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

Modal.setAppElement('#root');

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

  // Modal state for preview
  const [showPreview, setShowPreview] = useState(false);

  // Ref for preview card (we will clone this for PDF capture)
  const previewRef = useRef();

  // Controlled input for skills
  const [skillsInput, setSkillsInput] = useState('');

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
        // immutable update for nested arrays
        newData[section] = newData[section].map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        );
      } else if (section === 'skills') {
        // for programmatic updates only
        newData[section] = Array.isArray(value)
          ? value
          : value.split(',').map(skill => skill.trim()).filter(Boolean);
      } else {
        newData[section] = { ...newData[section], [field]: value };
      }

      return newData;
    });
  };

  // Add/Remove sections
  const addSection = (section, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setResumeData(prev => {
      const newData = { ...prev };
      if (section === 'experience') {
        newData.experience = [...newData.experience, { title: '', company: '', duration: '', description: '' }];
      } else if (section === 'education') {
        newData.education = [...newData.education, { degree: '', school: '', year: '', gpa: '' }];
      } else if (section === 'projects') {
        newData.projects = [...newData.projects, { name: '', description: '', technologies: '' }];
      }
      return newData;
    });
  };

  const removeSection = (section, index, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setResumeData(prev => {
      const newData = { ...prev };
      newData[section] = newData[section].filter((_, i) => i !== index);
      return newData;
    });
  };

  // Skills helpers
  const addSkill = (raw) => {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setResumeData(prev => ({ ...prev, skills: [...prev.skills, ...parts] }));
  };

  const handleSkillsInputChange = (e) => {
    setSkillsInput(e.target.value);
  };

  const handleSkillsKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(skillsInput);
      setSkillsInput('');
    } else if (e.key === ',') {
      e.preventDefault();
      addSkill(skillsInput);
      setSkillsInput('');
    } else if (e.key === 'Backspace' && skillsInput === '') {
      setResumeData(prev => ({ ...prev, skills: prev.skills.slice(0, -1) }));
    }
  };

  const handleSkillBlur = () => {
    if (skillsInput.trim()) {
      addSkill(skillsInput);
      setSkillsInput('');
    }
  };

  const removeSkill = (index, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setResumeData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  };

  // PDF Download Handler — clone visible preview node, capture it, then remove clone
  const handleDownloadPDF = async () => {
    const source = previewRef.current;
    if (!source) return;

    // Clone the preview node so we capture exactly what user sees.
    const clone = source.cloneNode(true);

    // Apply styles to make clone render correctly for html2canvas
    clone.style.position = 'absolute';
    clone.style.left = '-10000px'; // keep offscreen so user doesn't see flicker
    clone.style.top = '0px';
    // make sure width matches original (important for layout)
    const rect = source.getBoundingClientRect();
    clone.style.width = `${Math.round(rect.width)}px`;
    clone.style.background = '#ffffff';
    clone.style.padding = window.getComputedStyle(source).padding || '16px';
    clone.style.boxSizing = 'border-box';

    document.body.appendChild(clone);

    try {
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        // ensure offscreen content is captured
        scrollY: -window.scrollY
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // extra pages
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save('resume.pdf');
    } catch (err) {
      console.error('PDF generation failed', err);
    } finally {
      // cleanup clone
      if (clone && clone.parentNode) clone.parentNode.removeChild(clone);
    }
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
                    type="button"
                    onClick={(e) => addSection('experience', e)}
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
                        type="button"
                        onClick={(e) => removeSection('experience', index, e)}
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
                <div className="border rounded-lg px-3 py-2">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {resumeData.skills.map((skill, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={(e) => removeSkill(index, e)}
                        className="flex items-center gap-2 bg-blue-50 text-blue-700 text-xs rounded px-2 py-1"
                      >
                        <span>{skill}</span>
                        <span className="text-red-500">✕</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Type skill and press Enter or comma"
                    value={skillsInput}
                    onChange={handleSkillsInputChange}
                    onKeyDown={handleSkillsKeyDown}
                    onBlur={handleSkillBlur}
                    className="w-full px-2 py-1 outline-none"
                  />
                </div>
              </div>

              {/* Education */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Education</h3>
                  <button
                    type="button"
                    onClick={(e) => addSection('education', e)}
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
                        type="button"
                        onClick={(e) => removeSection('education', index, e)}
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
              <div ref={previewRef} className="bg-white rounded-xl p-6 shadow-sm">
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
                <button
                  type="button"
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
                  onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
                >
                  <Eye className="w-5 h-5" />
                  <span>Preview Full Resume</span>
                </button>
                <button
                  type="button"
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 flex items-center justify-center space-x-2"
                  onClick={handleDownloadPDF}
                >
                  <Download className="w-5 h-5" />
                  <span>Download PDF</span>
                </button>
                <button type="button" className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>AI Enhance</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Resume Preview Modal */}
      <Modal
        isOpen={showPreview}
        onRequestClose={() => setShowPreview(false)}
        contentLabel="Full Resume Preview"
        style={{
          content: {
            maxWidth: '700px',
            margin: 'auto',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: '16px',
            padding: '32px'
          }
        }}
      >
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 float-right"
        >
          Close
        </button>
        <div>
          <h2 className="text-2xl font-bold mb-2">{resumeData.personalInfo.fullName || 'Your Name'}</h2>
          <p className="text-gray-600">{resumeData.personalInfo.email}</p>
          <p className="text-gray-600">{resumeData.personalInfo.phone}</p>
          <p className="text-gray-600 mb-4">{resumeData.personalInfo.location}</p>
          {resumeData.personalInfo.summary && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1">Summary</h4>
              <p>{resumeData.personalInfo.summary}</p>
            </div>
          )}
          {resumeData.experience.some(exp => exp.title) && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1">Experience</h4>
              {resumeData.experience.filter(exp => exp.title).map((exp, idx) => (
                <div key={idx} className="mb-2">
                  <strong>{exp.title}</strong> at {exp.company} ({exp.duration})
                  <div>{exp.description}</div>
                </div>
              ))}
            </div>
          )}
          {resumeData.education.some(edu => edu.degree) && (
            <div>
              <h4 className="font-semibold mb-1">Education</h4>
              {resumeData.education.filter(edu => edu.degree).map((edu, idx) => (
                <div key={idx} className="mb-2">
                  <strong>{edu.degree}</strong> at {edu.school} ({edu.year})
                  {edu.gpa && <span> | GPA: {edu.gpa}</span>}
                </div>
              ))}
            </div>
          )}
          {resumeData.skills.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-1">Skills</h4>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
          {resumeData.projects.some(proj => proj.name) && (
            <div className="mt-4">
              <h4 className="font-semibold mb-1">Projects</h4>
              {resumeData.projects.filter(proj => proj.name).map((proj, idx) => (
                <div key={idx} className="mb-2">
                  <strong>{proj.name}</strong>: {proj.description}
                  {proj.technologies && <div className="text-xs text-gray-500">Tech: {proj.technologies}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ResumeDesigner;