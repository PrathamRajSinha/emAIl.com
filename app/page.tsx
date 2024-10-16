'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ClipboardDocumentIcon, PencilIcon } from '@heroicons/react/24/outline';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY!);

const commonSubjects = [
  'Meeting Request',
  'Project Update',
  'Thank You',
  'Inquiry',
  'Follow-up',
  'Leave Request',
];

const leaveReasons = [
  'Vacation',
  'Sick Leave',
  'Personal Emergency',
  'Family Event',
  'Medical Appointment',
  'Other',
];

const recipientOptions = [
  'Sir',
  'Madam',
  'Mr.',
  'Ms.',
  'Dr.',
  'Name',
  'Other',
];

const LoadingScreen = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-5 rounded-lg shadow-lg flex flex-col items-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
      <p className="text-gray-700 font-semibold">Generating Email...</p>
    </div>
  </div>
);

interface EditableEmailProps {
  email: string;
  onEmailChange: (newEmail: string) => void;
  isEditing: boolean;
  name: string;
}

const EditableEmail: React.FC<EditableEmailProps> = ({ email, onEmailChange, isEditing, name }) => {
  const [editableEmail, setEditableEmail] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const parts = email.split(/(\[[^\]]+\])/g);
    const newEditableEmail = parts.map((part, index) => {
      if (part.match(/^\[[^\]]+\]$/)) {
        const placeholder = part.slice(1, -1);
        if (placeholder.toLowerCase() === 'your name') {
          return name;
        }
        return (
          <span key={index} className="relative inline-block">
            {isEditing ? (
              <input
                type="text"
                defaultValue={placeholder}
                className="px-1 py-0.5 bg-red-100 rounded border border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 min-w-[50px]"
                style={{ width: `${placeholder.length + 2}ch` }}
                onChange={(e) => {
                  const newParts = [...parts];
                  newParts[index] = `[${e.target.value}]`;
                  onEmailChange(newParts.join(''));
                }}
              />
            ) : (
              <span className="bg-red-200 px-1 py-0.5 rounded">{placeholder}</span>
            )}
          </span>
        );
      }
      return part;
    });
    setEditableEmail(newEditableEmail);
  }, [email, onEmailChange, isEditing, name]);

  return (
    <div className="whitespace-pre-wrap">
      {isEditing ? (
        <textarea
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="w-full h-full p-2 bg-white bg-opacity-20 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          style={{ minHeight: '200px' }}
        />
      ) : (
        editableEmail
      )}
    </div>
  );
};

const EditableSubject: React.FC<{ 
  subject: string; 
  onSubjectChange: (newSubject: string) => void;
  isEditing: boolean;
}> = ({ subject, onSubjectChange, isEditing }) => {
  return (
    <div className="relative inline-block w-full">
      {isEditing ? (
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          className="w-full p-2 pr-8 border border-gray-300 rounded-md shadow-sm bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
      ) : (
        <div className="w-full p-2 pr-8 border border-gray-300 rounded-md shadow-sm bg-white bg-opacity-20 text-white">
          {subject}
        </div>
      )}
    </div>
  );
};

export default function Home() {
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [tone, setTone] = useState('');
  const [recipient, setRecipient] = useState('');
  const [recipientGender, setRecipientGender] = useState('');
  const [otherRecipientGender, setOtherRecipientGender] = useState('');
  const [recipientDetails, setRecipientDetails] = useState('');
  const [otherPreferences, setOtherPreferences] = useState('');
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [otherLeaveReason, setOtherLeaveReason] = useState('');
  const [hasAttachment, setHasAttachment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [includeFooter, setIncludeFooter] = useState(false);
  const [footerText, setFooterText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copyPrompt, setCopyPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const drawDots = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      for (let x = 0; x < canvas.width; x += 30) {
        for (let y = 0; y < canvas.height; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    drawDots();

    window.addEventListener('resize', () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawDots();
    });

    return () => {
      window.removeEventListener('resize', drawDots);
    };
  }, []);

  const generateEmail = async () => {
    setIsLoading(true);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    let prompt = `Write an email with the following details:
    From: ${name}
    Reason: ${reason}
    Tone: ${tone}
    Recipient: ${recipient}
    Recipient Gender/Title: ${recipientGender === 'Other' ? otherRecipientGender : recipientGender}
    Recipient Details: ${recipientDetails}
    Other Preferences: ${otherPreferences}`;

    if (reason === 'Leave Request') {
      prompt += `\nLeave Start Date: ${startDate}
      Leave End Date: ${endDate}
      Reason for Leave: ${leaveReason === 'Other' ? otherLeaveReason : leaveReason}`;
    }

    if (hasAttachment) {
      prompt += `\nPlease include a mention of an attachment in the email body, such as "Please find the attached document" or "I have attached the required files for your reference."`;
    }

    if (includeFooter) {
      prompt += `if there is a given footer, \nPlease include the following footer at the end of the email: "${footerText}". if there is no footer provided, just use the given details to make your own using "${name}" and "${tone}"`
      ;
    }

    prompt += `\n\nPlease use the appropriate salutation (Dear Sir/Madam/Mr./Ms./Name) based on the recipient's gender/title provided.
    Use square brackets [] to denote any placeholders or parts that might need editing, such as [Project Name] or [Specific Date].
    Do not use any symbols like ** in the email.
    
    Generate both a subject line and the main email body. Format the response as follows:
    Subject: [Generated Subject]
    
    [Generated Email Body]`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const [subject, ...emailBody] = text.split('\n\n');
      setGeneratedSubject(subject.replace('Subject: ', ''));
      setEditedSubject(subject.replace('Subject: ', ''));
      setGeneratedEmail(emailBody.join('\n\n'));
      setEditedEmail(emailBody.join('\n\n'));
    } catch (error) {
      console.error('Error generating email:', error);
      setGeneratedSubject('');
      setEditedSubject('');
      setGeneratedEmail('An error occurred while generating the email. Please try again.');
      setEditedEmail('An error occurred while generating the email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyPrompt('Email copied!');
    setTimeout(() => setCopyPrompt(''), 2000);
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
    setEditPrompt(isEditing ? '' : 'Editing mode on');
    setTimeout(() => setEditPrompt(''), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" style={{zIndex: 0}}></canvas>
      {isLoading && <LoadingScreen />}
      <div className="max-w-4xl mx-auto relative z-10">
        <h1 className="text-4xl font-bold text-center text-white mb-8">AI Email Generator</h1>
        <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg shadow-lg rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Reason for Email</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter reason or select below"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {commonSubjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setReason(subject)}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-full hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {reason === 'Leave Request' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-white">Reason for Leave</label>
                <select
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select reason</option>
                  {leaveReasons.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
              {leaveReason === 'Other' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-white">Specify Other Reason</label>
                  <input
                    type="text"
                    value={otherLeaveReason}
                    onChange={(e) => setOtherLeaveReason(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Please specify your reason for leave"
                  />
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select tone</option>
                <option value="Official">Official</option>
                <option value="Unofficial">Unofficial</option>
                <option value="Friendly">Friendly</option>
                <option value="Formal">Formal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-white">Recipient</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter recipient's name or title"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white">Recipient Gender/Title</label>
              <select
                value={recipientGender}
                onChange={(e) => setRecipientGender(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select gender/title</option>
                {recipientOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            {recipientGender === 'Other' && (
              <div>
                <label className="block text-sm font-medium text-white">Specify Other Gender/Title</label>
                <input
                  type="text"
                  value={otherRecipientGender}
                  onChange={(e) => setOtherRecipientGender(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Specify gender/title"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-white">Recipient Details</label>
              <select
                value={recipientDetails}
                onChange={(e) => setRecipientDetails(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select recipient details</option>
                <option value="Known">Known person</option>
                <option value="Senior">Senior</option>
                <option value="Junior">Junior</option>
                <option value="Peer">Peer</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={hasAttachment}
                onChange={(e) => setHasAttachment(e.target.checked)}
                className="form-checkbox h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-sm text-white">Mention attached files in the email</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-white">Other Preferences</label>
            <textarea
              value={otherPreferences}
              onChange={(e) => setOtherPreferences(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
              placeholder="Any additional details or preferences"
            ></textarea>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeFooter}
                onChange={(e) => setIncludeFooter(e.target.checked)}
                className="form-checkbox h-5 w-5 text-indigo-600"
              />
              <span className="ml-2 text-sm text-white">Include footer</span>
            </label>
            {includeFooter && (
              <textarea
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="mt-2 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white bg-opacity-20 text-white placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                rows={2}
                placeholder="Enter footer text"
              ></textarea>
            )}
          </div>
          <button
            onClick={generateEmail}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out transform hover:scale-105"
          >
            Generate Email
          </button>
          {generatedSubject && (
  <div className="mt-6">
    <label className="block text-sm font-medium text-white mb-2">Generated Subject</label>
    <div className="relative">
      <EditableSubject 
        subject={editedSubject} 
        onSubjectChange={setEditedSubject}
        isEditing={isEditing}
      />
      <div className="absolute top-2 right-2 flex">
        <button
          onClick={() => toggleEditing()}
          className="p-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none mr-2"
          title={isEditing ? "Save changes" : "Edit subject"}
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => copyToClipboard(editedSubject)}
          className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
          title="Copy subject to clipboard"
        >
          <ClipboardDocumentIcon className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  </div>
)}
          {generatedEmail && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-white mb-2">Generated Email</label>
              <div className="relative">
                <div
                  className="w-full p-4 border border-gray-300 rounded-md shadow-sm bg-white bg-opacity-20 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  style={{
                    fontSize: '1rem',
                    lineHeight: '1.5',
                    minHeight: '200px',
                    maxHeight: '60vh',
                    overflowY: 'auto'
                  }}
                >
                  <EditableEmail 
                    email={editedEmail} 
                    onEmailChange={setEditedEmail} 
                    isEditing={isEditing}
                    name={name}
                  />
                </div>
                <div className="absolute top-2 right-2 flex">
                  <button
                    onClick={() => toggleEditing()}
                    className="p-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none mr-2"
                    title={isEditing ? "Save changes" : "Edit email"}
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(editedEmail)}
                    className="p-2 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none"
                    title="Copy email to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>
          )}
          {(copyPrompt || editPrompt) && (
            <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg">
              {copyPrompt || editPrompt}
            </div>
          )}
        </div>
</div>
      <footer className="footer mt-8 text-center text-white">
        <p>Made by Pratham | &copy; 2024 All Rights Reserved</p>
        <p>Visit my portfolio: <a href="https://prathamrajsinha.com" target="_blank" rel="noopener noreferrer" className="underline">prathamrajsinha.com</a></p>
      </footer>
    </div>
  );
}
