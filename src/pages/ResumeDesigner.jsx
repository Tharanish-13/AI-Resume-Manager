import React, { useState, useEffect, useRef } from 'react';
import { templateService } from '../services/api'; // Ensure this path is correct
import { Palette, Download, Eye, Zap, Loader2, X as XIcon } from 'lucide-react'; // Added Loader2, XIcon
import Modal from 'react-modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '../components/ui/Toaster'; // Ensure this path is correct

// Set the app element for accessibility
Modal.setAppElement('#root'); // Make sure '#root' matches your main app div ID

// Simple CSS classes for reuse (consider moving to index.css or tailwind apply)
const inputStyles = "block w-full px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm";
const textareaStyles = "block w-full px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm";
const previewHeadingStyles = "text-sm font-semibold text-gray-700 border-b border-gray-200 mb-1 mt-2";
const previewTextStyles = "text-xs text-gray-600 whitespace-pre-wrap leading-relaxed"; // Handle line breaks, added leading

// Inject styles (simple method for this example - move to CSS for larger apps)
const styleSheet = `
    .form-input { @apply ${inputStyles}; }
    .form-textarea { @apply ${textareaStyles}; }
    .preview-heading { @apply ${previewHeadingStyles}; }
    .preview-text { @apply ${previewTextStyles}; }
    .action-button { @apply w-full text-white py-2.5 px-4 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 disabled:opacity-60; }
    /* Simple Scrollbar */
    .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #aaa; }
    /* Ensure react-modal overlay is styled if needed */
    .ReactModal__Overlay {
        background-color: rgba(0, 0, 0, 0.75) !important;
        z-index: 50; /* Ensure it's above other content */
    }
`;

// Inject styles once
if (!document.getElementById('resume-designer-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'resume-designer-styles';
    styleElement.innerHTML = styleSheet;
    document.head.appendChild(styleElement);
}


const ResumeDesigner = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [resumeData, setResumeData] = useState({
        personalInfo: { fullName: '', email: '', phone: '', location: '', summary: '' },
        experience: [{ title: '', company: '', duration: '', description: '' }],
        education: [{ degree: '', school: '', year: '', gpa: '' }],
        skills: [],
        projects: [{ name: '', description: '', technologies: '' }]
    });
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [showPreviewModal, setShowPreviewModal] = useState(false); // Changed state name
    const [isDownloading, setIsDownloading] = useState(false);
    const previewRef = useRef(); // Ref for inline preview
    const modalPreviewRef = useRef(); // Ref for modal preview (for download accuracy)
    const { toast } = useToast();

    // Fetch templates on component mount
    useEffect(() => {
        const fetchTemplates = async () => {
            setLoadingTemplates(true);
            try {
                const data = await templateService.getTemplates();
                if (Array.isArray(data.templates)) {
                    setTemplates(data.templates);
                    if (data.templates.length > 0) {
                        setSelectedTemplate(data.templates[0]);
                    } else {
                        toast({ title: "No Templates Found", variant: "warning" });
                    }
                } else {
                    console.error('API did not return an array:', data);
                    setTemplates([]);
                    toast({ title: "Error", description: "Received invalid template data.", variant: "destructive" });
                }
            } catch (error) {
                console.error('Failed to fetch templates:', error);
                setTemplates([]);
                toast({ title: "Fetch Error", description: "Could not load templates.", variant: "destructive" });
            } finally {
                setLoadingTemplates(false);
            }
        };
        fetchTemplates();
    }, [toast]); // Include toast in dependency array

    // --- Form Input Handling ---
    const handleInputChange = (section, field, value, index = null) => {
        setResumeData(prev => {
            const newData = JSON.parse(JSON.stringify(prev));
            if (index !== null && newData[section]?.[index] !== undefined) {
                newData[section][index][field] = value;
            } else if (section === 'skills') {
                newData.skills = value.split(',').map(skill => skill.trim()).filter(Boolean);
            } else if (newData[section]) {
                newData[section][field] = value;
            }
            return newData;
        });
    };

    // --- Add/Remove Dynamic Sections ---
    const addSectionItem = (section) => {
        setResumeData(prev => {
            const newData = JSON.parse(JSON.stringify(prev));
            let newItem = {};
            if (section === 'experience') newItem = { title: '', company: '', duration: '', description: '' };
            if (section === 'education') newItem = { degree: '', school: '', year: '', gpa: '' };
            if (section === 'projects') newItem = { name: '', description: '', technologies: '' };

            if (newData[section]) newData[section].push(newItem);
            return newData;
        });
    };

    const removeSectionItem = (section, index) => {
        setResumeData(prev => {
            const newData = JSON.parse(JSON.stringify(prev));
            if (newData[section] && newData[section].length > 1) {
                newData[section].splice(index, 1);
            } else {
                toast({ title: "Cannot Remove", description: `At least one entry is required.`, variant: "warning", duration: 2000 });
            }
            return newData;
        });
    };

    // --- PDF Download Handler (using Modal content for accuracy) ---
    const handleDownloadPDF = async () => {
        // Ensure modal is open briefly to render content if not already open
        if (!showPreviewModal) {
             setShowPreviewModal(true);
             // Give modal time to render - adjust delay if needed
             await new Promise(resolve => setTimeout(resolve, 300));
        }

        const elementToCapture = modalPreviewRef.current; // Target the modal content
        if (!elementToCapture) {
             toast({ title: "Error", description: "Preview element for PDF not found.", variant: "destructive" });
             if (!showPreviewModal) setShowPreviewModal(false); // Close modal if opened just for this
             return;
        }

        setIsDownloading(true);
        toast({ title: "Generating PDF...", description: "Please wait.", duration: 3000 });

        try {
            // Adjust html2canvas options for potentially better rendering
            const canvas = await html2canvas(elementToCapture, {
                scale: 3, // Higher scale for better quality
                useCORS: true,
                logging: false,
                scrollX: -window.scrollX, // Attempt to handle scroll position
                scrollY: -window.scrollY,
                windowWidth: elementToCapture.scrollWidth,
                windowHeight: elementToCapture.scrollHeight
            });

            const imgData = canvas.toDataURL('image/png', 1.0); // Use full quality PNG
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = imgProps.height / imgProps.width;

            const margin = 30; // Margin in points (pt)
            let imgWidth = pdfWidth - (margin * 2);
            let imgHeight = imgWidth * ratio;
            let heightLeft = imgHeight;
            let position = margin; // Start position with margin

            // Add first page
            pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - (margin * 2)); // Subtract visible height (page height - top/bottom margin)

            // Add subsequent pages if content overflows
            while (heightLeft > 0) {
                position = position - (pdfHeight - (margin * 2)); // Calculate negative offset for next page
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - (margin * 2));
            }

            const safeName = (resumeData.personalInfo.fullName || 'Resume').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeName}_${selectedTemplate?.name || 'template'}.pdf`;
            pdf.save(fileName);
            toast({ title: "Download Started", description: `Saved as ${fileName}` });

        } catch (error) {
            console.error("Failed to generate PDF:", error);
            toast({ title: "PDF Generation Failed", description: "Could not create the PDF file.", variant: "destructive" });
        } finally {
            setIsDownloading(false);
            // Close modal if it was opened just for download
             if (!showPreviewModal) setShowPreviewModal(false); // Close modal if we opened it
             else setShowPreviewModal(false); // Always close modal after download attempt
        }
    };

    // --- Render Loading State ---
    if (loadingTemplates) {
        return (
            <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
                <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 animate-spin text-blue-600" />
            </div>
        );
    }

    // --- Render Main Component ---
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">Resume Designer</h1>
                    <p className="text-sm sm:text-base text-gray-600">Choose a template and fill in your details.</p>
                </div>

                <div className="grid lg:grid-cols-12 gap-6 sm:gap-8">
                    {/* Template Selection Column */}
                    <div className="lg:col-span-3 order-1">
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4 sticky top-4 bg-gray-50 py-2 z-10">Choose Template</h2>
                        <div className="space-y-3 sm:space-y-4 max-h-[calc(100vh-10rem)] lg:max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 custom-scrollbar">
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`cursor-pointer rounded-lg overflow-hidden transition-all duration-200 border ${
                                        selectedTemplate?.id === template.id
                                            ? 'ring-2 ring-offset-1 ring-blue-500 shadow-md border-blue-300'
                                            : 'border-gray-200 hover:shadow-sm hover:border-gray-300'
                                    }`}
                                    title={`Select ${template.name} template`}
                                >
                                    <img
                                        src={template.preview}
                                        alt={`${template.name} template preview`}
                                        className="w-full h-32 sm:h-40 object-cover bg-gray-200"
                                        loading="lazy"
                                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200/cccccc/999999?text=Error'; }}
                                    />
                                    <div className="p-2 sm:p-3 bg-white">
                                        <h3 className="font-semibold text-gray-800 text-xs sm:text-sm mb-0.5 truncate">{template.name}</h3>
                                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] sm:text-xs rounded">
                                            {template.category}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {!loadingTemplates && templates.length === 0 && (
                                <p className="text-gray-500 text-center text-sm py-4">No templates available.</p>
                            )}
                        </div>
                    </div>

                    {/* Form Column */}
                    <div className="lg:col-span-5 order-3 lg:order-2">
                         <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6 border-b pb-2">Resume Information</h2>
                            {/* Form Sections */}
                            <section className="mb-5 sm:mb-6"> {/* Personal Info */}
                                {/* ... content ... */}
                                <h3 className="text-md sm:text-lg font-medium text-gray-700 mb-3">Personal Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <input type="text" placeholder="Full Name *" value={resumeData.personalInfo.fullName} onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)} required className="form-input" />
                                    <input type="email" placeholder="Email *" value={resumeData.personalInfo.email} onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)} required className="form-input" />
                                    <input type="tel" placeholder="Phone" value={resumeData.personalInfo.phone} onChange={(e) => handleInputChange('personalInfo', 'phone', e.target.value)} className="form-input" />
                                    <input type="text" placeholder="Location (City, Country)" value={resumeData.personalInfo.location} onChange={(e) => handleInputChange('personalInfo', 'location', e.target.value)} className="form-input" />
                                </div>
                                <textarea placeholder="Professional Summary / Objective" value={resumeData.personalInfo.summary} onChange={(e) => handleInputChange('personalInfo', 'summary', e.target.value)} rows={3} className="mt-3 sm:mt-4 w-full form-textarea" />
                            </section>
                            <section className="mb-5 sm:mb-6"> {/* Experience */}
                                {/* ... content ... */}
                                 <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-md sm:text-lg font-medium text-gray-700">Experience</h3>
                                    <button onClick={() => addSectionItem('experience')} className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium">+ Add</button>
                                </div>
                                {resumeData.experience.map((exp, index) => (
                                    <div key={index} className="mb-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-2 sm:mb-3">
                                            <input type="text" placeholder="Job Title *" value={exp.title} onChange={(e) => handleInputChange('experience', 'title', e.target.value, index)} required className="form-input" />
                                            <input type="text" placeholder="Company *" value={exp.company} onChange={(e) => handleInputChange('experience', 'company', e.target.value, index)} required className="form-input" />
                                        </div>
                                        <input type="text" placeholder="Duration (e.g., Jan 2020 - Present)" value={exp.duration} onChange={(e) => handleInputChange('experience', 'duration', e.target.value, index)} className="w-full mb-2 sm:mb-3 form-input" />
                                        <textarea placeholder="Key Responsibilities & Achievements" value={exp.description} onChange={(e) => handleInputChange('experience', 'description', e.target.value, index)} rows={3} className="w-full form-textarea" />
                                        {resumeData.experience.length > 1 && ( <button onClick={() => removeSectionItem('experience', index)} className="mt-1.5 text-red-500 hover:text-red-700 text-xs font-medium">Remove</button> )}
                                    </div>
                                ))}
                            </section>
                            <section className="mb-5 sm:mb-6"> {/* Education */}
                                {/* ... content ... */}
                                <div className="flex items-center justify-between mb-3">
                                     <h3 className="text-md sm:text-lg font-medium text-gray-700">Education</h3>
                                     <button onClick={() => addSectionItem('education')} className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium">+ Add</button>
                                </div>
                                {resumeData.education.map((edu, index) => (
                                    <div key={index} className="mb-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                            <input type="text" placeholder="Degree/Certificate *" value={edu.degree} onChange={(e) => handleInputChange('education', 'degree', e.target.value, index)} required className="form-input"/>
                                            <input type="text" placeholder="Institution/School *" value={edu.school} onChange={(e) => handleInputChange('education', 'school', e.target.value, index)} required className="form-input"/>
                                            <input type="text" placeholder="Year of Completion *" value={edu.year} onChange={(e) => handleInputChange('education', 'year', e.target.value, index)} required className="form-input"/>
                                            <input type="text" placeholder="GPA (Optional)" value={edu.gpa} onChange={(e) => handleInputChange('education', 'gpa', e.target.value, index)} className="form-input"/>
                                        </div>
                                         {resumeData.education.length > 1 && ( <button onClick={() => removeSectionItem('education', index)} className="mt-1.5 text-red-500 hover:text-red-700 text-xs font-medium">Remove</button> )}
                                    </div>
                                ))}
                            </section>
                             <section className="mb-5 sm:mb-6"> {/* Skills */}
                                {/* ... content ... */}
                                <h3 className="text-md sm:text-lg font-medium text-gray-700 mb-3">Skills</h3>
                                <input type="text" placeholder="Skills, comma-separated" value={resumeData.skills.join(', ')} onChange={(e) => handleInputChange('skills', null, e.target.value)} className="w-full form-input" />
                                <p className="text-xs text-gray-500 mt-1">e.g., Python, SQL, Project Management</p>
                             </section>
                            <section> {/* Projects */}
                                {/* ... content ... */}
                                <div className="flex items-center justify-between mb-3">
                                     <h3 className="text-md sm:text-lg font-medium text-gray-700">Projects (Optional)</h3>
                                     <button onClick={() => addSectionItem('projects')} className="text-blue-600 hover:text-blue-800 text-xs sm:text-sm font-medium">+ Add</button>
                                </div>
                                {resumeData.projects.map((proj, index) => (
                                    <div key={index} className="mb-3 p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                                        <input type="text" placeholder="Project Name" value={proj.name} onChange={(e) => handleInputChange('projects', 'name', e.target.value, index)} className="w-full mb-2 form-input"/>
                                        <textarea placeholder="Description & Role" value={proj.description} onChange={(e) => handleInputChange('projects', 'description', e.target.value, index)} rows={2} className="w-full mb-2 form-textarea"/>
                                        <input type="text" placeholder="Technologies Used (comma-separated)" value={proj.technologies} onChange={(e) => handleInputChange('projects', 'technologies', e.target.value, index)} className="w-full form-input"/>
                                        {resumeData.projects.length > 1 && ( <button onClick={() => removeSectionItem('projects', index)} className="mt-1.5 text-red-500 hover:text-red-700 text-xs font-medium">Remove</button> )}
                                    </div>
                                ))}
                            </section>
                        </div>
                    </div>

                    {/* Preview & Actions Column */}
                    <div className="lg:col-span-4 order-2 lg:order-3">
                        <div className="sticky top-6">
                            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Preview & Actions</h2>
                            {/* Inline Preview Area */}
                            <div ref={previewRef} className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 mb-4 overflow-hidden" style={{ aspectRatio: '1 / 1.414', maxHeight: '500px', overflowY: 'auto' }}>
                                {/* Basic Preview Structure */}
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800 border-b pb-1 mb-2">{resumeData.personalInfo.fullName || 'Your Name'}</h3>
                                <div className="text-[9px] sm:text-[10px] text-gray-600 mb-2">
                                    {resumeData.personalInfo.email && <p>{resumeData.personalInfo.email}</p>}
                                    {resumeData.personalInfo.phone && <p>{resumeData.personalInfo.phone}</p>}
                                    {resumeData.personalInfo.location && <p>{resumeData.personalInfo.location}</p>}
                                </div>
                                {resumeData.personalInfo.summary && <section className="mb-2"><h4 className="preview-heading !text-xs !mb-0.5">Summary</h4><p className="preview-text !text-[9px] sm:!text-[10px]">{resumeData.personalInfo.summary}</p></section>}
                                {resumeData.experience.some(e => e.title || e.company) && <section className="mb-2"><h4 className="preview-heading !text-xs !mb-0.5">Experience</h4>{resumeData.experience.filter(e => e.title || e.company).map((exp, i) => <div key={i} className="mb-1"><strong className="text-[10px] sm:text-xs font-semibold">{exp.title}</strong><p className="text-[9px] sm:text-[10px]">{exp.company}{exp.duration && ` | ${exp.duration}`}</p><p className="preview-text !text-[9px] sm:!text-[10px] mt-0.5">{exp.description}</p></div>)}</section>}
                                {resumeData.education.some(e => e.degree || e.school) && <section className="mb-2"><h4 className="preview-heading !text-xs !mb-0.5">Education</h4>{resumeData.education.filter(e => e.degree || e.school).map((edu, i) => <div key={i} className="mb-0.5"><strong className="text-[10px] sm:text-xs font-semibold">{edu.degree}</strong><p className="text-[9px] sm:text-[10px]">{edu.school}{edu.year && ` | ${edu.year}`}{edu.gpa && ` | GPA: ${edu.gpa}`}</p></div>)}</section>}
                                {resumeData.skills.length > 0 && <section className="mb-2"><h4 className="preview-heading !text-xs !mb-0.5">Skills</h4><p className="preview-text !text-[9px] sm:!text-[10px]">{resumeData.skills.join(' • ')}</p></section>}
                                {resumeData.projects.some(p => p.name) && <section><h4 className="preview-heading !text-xs !mb-0.5">Projects</h4>{resumeData.projects.filter(p => p.name).map((proj, i) => <div key={i} className="mb-1"><strong className="text-[10px] sm:text-xs font-semibold">{proj.name}</strong><p className="preview-text !text-[9px] sm:!text-[10px] mt-0.5">{proj.description}</p>{proj.technologies && <p className="text-[8px] sm:text-[9px] text-gray-500">Tech: {proj.technologies}</p>}</div>)}</section>}
                            </div>
                            {/* Action Buttons */}
                            <div className="space-y-2 sm:space-y-3">
                                <button onClick={() => setShowPreviewModal(true)} className="action-button bg-indigo-600 hover:bg-indigo-700"> <Eye className="w-4 h-4" /> <span>Preview Full</span> </button>
                                <button onClick={handleDownloadPDF} disabled={isDownloading} className="action-button bg-green-600 hover:bg-green-700">
                                    {isDownloading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Download className="w-4 h-4 sm:w-5 sm:h-5" />}
                                    <span>{isDownloading ? 'Generating...' : 'Download PDF'}</span>
                                </button>
                                {/* <button className="action-button bg-purple-600 hover:bg-purple-700"> <Zap className="w-4 h-4" /> AI Enhance </button> */}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Resume Preview Modal */}
            <Modal
              isOpen={showPreviewModal}
              onRequestClose={() => setShowPreviewModal(false)}
              contentLabel="Full Resume Preview"
              style={{
                overlay: {
                  backgroundColor: 'rgba(0, 0, 0, 0.75)',
                  zIndex: 1000 // Ensure overlay is high enough
                },
                content: {
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  right: 'auto',
                  bottom: 'auto',
                  marginRight: '-50%',
                  transform: 'translate(-50%, -50%)',
                  maxWidth: '8.5in', // Approx A4 width
                  maxHeight: '90vh', // Limit height
                  width: '90%', // Responsive width
                  overflowY: 'auto', // Allow scrolling within modal
                  border: 'none',
                  background: '#fff',
                  borderRadius: '8px',
                  padding: '20px 30px', // Decent padding
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  zIndex: 1001
                }
              }}
            >
              {/* Modal Content - Use Ref for accurate PDF generation */}
              <div ref={modalPreviewRef} className="resume-modal-content">
                  {/* Basic Preview Structure - Mirrored from inline preview */}
                  <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">{resumeData.personalInfo.fullName || 'Your Name'}</h2>
                  <div className="text-sm text-gray-600 mb-4">
                      {resumeData.personalInfo.email && <p>{resumeData.personalInfo.email}</p>}
                      {resumeData.personalInfo.phone && <p>{resumeData.personalInfo.phone}</p>}
                      {resumeData.personalInfo.location && <p>{resumeData.personalInfo.location}</p>}
                  </div>
                  {resumeData.personalInfo.summary && <section className="mb-4"><h4 className="preview-heading !text-base !mb-1">Summary</h4><p className="preview-text !text-sm">{resumeData.personalInfo.summary}</p></section>}
                  {resumeData.experience.some(e => e.title || e.company) && <section className="mb-4"><h4 className="preview-heading !text-base !mb-1">Experience</h4>{resumeData.experience.filter(e => e.title || e.company).map((exp, i) => <div key={i} className="mb-2"><strong className="text-sm font-semibold">{exp.title}</strong><p className="text-xs">{exp.company}{exp.duration && ` | ${exp.duration}`}</p><p className="preview-text !text-sm mt-0.5">{exp.description}</p></div>)}</section>}
                  {resumeData.education.some(e => e.degree || e.school) && <section className="mb-4"><h4 className="preview-heading !text-base !mb-1">Education</h4>{resumeData.education.filter(e => e.degree || e.school).map((edu, i) => <div key={i} className="mb-1"><strong className="text-sm font-semibold">{edu.degree}</strong><p className="text-xs">{edu.school}{edu.year && ` | ${edu.year}`}{edu.gpa && ` | GPA: ${edu.gpa}`}</p></div>)}</section>}
                  {resumeData.skills.length > 0 && <section className="mb-4"><h4 className="preview-heading !text-base !mb-1">Skills</h4><p className="preview-text !text-sm">{resumeData.skills.join(' • ')}</p></section>}
                  {resumeData.projects.some(p => p.name) && <section><h4 className="preview-heading !text-base !mb-1">Projects</h4>{resumeData.projects.filter(p => p.name).map((proj, i) => <div key={i} className="mb-2"><strong className="text-sm font-semibold">{proj.name}</strong><p className="preview-text !text-sm mt-0.5">{proj.description}</p>{proj.technologies && <p className="text-xs text-gray-500">Tech: {proj.technologies}</p>}</div>)}</section>}
              </div>
              {/* Close Button inside Modal */}
              <button
                  onClick={() => setShowPreviewModal(false)}
                  className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 p-1 bg-gray-100 rounded-full"
                  aria-label="Close modal"
              >
                  <XIcon className="w-5 h-5" />
              </button>
            </Modal>
        </div>
    );
};

export default ResumeDesigner;  