'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Award, Download, Share2, Calendar, User, CheckCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface CourseCertificateProps {
  course: {
    id: string;
    title: string;
    instructor: {
      name: string;
    };
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  completionDate?: Date;
  certificateId?: string;
  isCompleted: boolean;
}

export function CourseCertificate({
  course,
  user,
  completionDate = new Date(),
  certificateId,
  isCompleted = false,
}: CourseCertificateProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedId, setGeneratedId] = useState(certificateId);
  const certificateRef = useRef<HTMLDivElement>(null);

  const generateCertificateId = () => {
    if (!generatedId) {
      const id = crypto.randomUUID();
      setGeneratedId(id);
      return id;
    }
    return generatedId;
  };

  const handleDownload = async () => {
    if (!certificateRef.current) return;

    setIsGenerating(true);
    try {
      // Use html2canvas to capture the certificate
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape for certificate
      const imgWidth = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${user.firstName}_${user.lastName}_${course.title}_Certificate.pdf`);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${course.title} Completion Certificate`,
          text: `I completed "${course.title}" on ${completionDate.toLocaleDateString()}!`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Share failed:', error);
        // Fallback to social links
        copyToClipboard();
      }
    } else {
      // Fallback: copy link or open social
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    const shareText = `I completed "${course.title}" on ${completionDate.toLocaleDateString()}! Certificate ID: ${generateCertificateId()}`;
    navigator.clipboard.writeText(shareText);
    // Show toast or alert
    alert('Certificate link copied to clipboard!');
  };

  const handleSocialShare = (platform: string) => {
    const id = generateCertificateId();
    const shareUrl = window.location.origin;
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=I completed "${course.title}"!&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      default:
        return;
    }
    window.open(url, '_blank');
  };

  if (!isCompleted) {
    return (
      <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200">
        <CardContent className="p-8 text-center">
          <Award className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Course Completion Certificate</h2>
          <p className="text-gray-600 mb-4">Complete all modules to unlock your certificate!</p>
          <div className="flex justify-center space-x-2">
            <Button variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              View Progress
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const certId = generateCertificateId();
  const fullName = `${user.firstName} ${user.lastName}`;
  const formattedDate = completionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto">
      <Card 
        ref={certificateRef}
        className="border-4 border-gold-500 bg-gradient-to-br from-amber-50 to-yellow-100 shadow-2xl overflow-hidden relative"
        style={{
          fontFamily: 'serif', // For official look, override if possible
        }}
      >
        {/* Decorative border elements */}
        <div className="absolute inset-0 border-2 border-gold-300 rounded-lg" />
        <div className="absolute inset-2 border-2 border-amber-400 rounded-lg" />
        
        <CardContent className="p-12 relative z-10">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="bg-gold-500 text-white px-8 py-4 rounded-full inline-block mb-6">
              <Award className="h-12 w-12 mx-auto mb-2" />
              <h1 className="text-3xl font-bold uppercase tracking-wide">Certificate of Completion</h1>
            </div>
            <p className="text-xl text-gray-700 italic mb-2">This is to certify that</p>
          </div>

          {/* Main Content */}
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800 uppercase tracking-wide mb-2">
              {fullName}
            </h2>
            <p className="text-xl text-gray-600 mb-6">has successfully completed</p>
            <h3 className="text-3xl font-bold text-gold-700 mb-6 uppercase">
              {course.title}
            </h3>
            <p className="text-lg text-gray-600 italic">
              Under the instruction of {course.instructor.name}
            </p>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-8 mb-8 text-sm text-gray-600">
            <div className="text-center">
              <Calendar className="h-5 w-5 mx-auto mb-1" />
              <p className="font-semibold">Completion Date</p>
              <p>{formattedDate}</p>
            </div>
            <div className="text-center">
              <User className="h-5 w-5 mx-auto mb-1" />
              <p className="font-semibold">Student ID</p>
              <p>{user.id}</p>
            </div>
          </div>

          {/* Certificate ID */}
          <div className="bg-white border-2 border-gold-300 rounded-lg p-4 mb-8">
            <p className="text-center font-semibold text-gray-700 mb-2">Certificate Verification ID</p>
            <p className="text-lg font-mono text-gold-600 bg-gray-50 p-2 rounded">
              {certId}
            </p>
            <p className="text-xs text-gray-500 text-center mt-2">
              Verify at platform.com/verify/{certId}
            </p>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 pt-8 border-t-2 border-gold-300">
            <p className="text-sm text-gray-600 mb-4">
              Issued by the Platform Academy
            </p>
            <div className="flex justify-center space-x-1 text-xs text-gray-500">
              <span>•</span>
              <span>Official Recognition of Achievement</span>
              <span>•</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 mt-6">
        <Button onClick={handleDownload} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Download className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Download Certificate
            </>
          )}
        </Button>
        <Button onClick={handleShare} variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Share Certificate
        </Button>
      </div>

      {/* Social Share Options */}
      <div className="flex justify-center space-x-4 mt-4">
        <Button
          onClick={() => handleSocialShare('twitter')}
          size="sm"
          variant="ghost"
          className="text-blue-500 hover:bg-blue-50"
        >
          Twitter
        </Button>
        <Button
          onClick={() => handleSocialShare('linkedin')}
          size="sm"
          variant="ghost"
          className="text-blue-700 hover:bg-blue-50"
        >
          LinkedIn
        </Button>
        <Button
          onClick={() => handleSocialShare('facebook')}
          size="sm"
          variant="ghost"
          className="text-blue-600 hover:bg-blue-50"
        >
          Facebook
        </Button>
      </div>

      {/* Verification Note */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Verification:</strong> Use the Certificate ID to verify completion status on the platform. This certificate is official and tamper-proof.
        </p>
      </div>
}
