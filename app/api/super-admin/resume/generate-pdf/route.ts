import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'superAdmin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { resume, template, sidebarColor = 'slate' } = await request.json();

    const html = generateResumeHTML(resume, template, sidebarColor);

    // Launch browser
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: await chromium.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'
      ),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resume.personalInfo.name.replace(/\s+/g, '_')}_Resume.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

function generateResumeHTML(resume: any, template: string, sidebarColor: string = 'slate') {
  const { personalInfo, summary, experience, education, skills, certifications } = resume;

  // Color mapping for sidebar
  const colorMap: Record<string, { bg: string; accent: string; border: string }> = {
    slate: { bg: 'linear-gradient(to bottom, #1e293b, #0f172a)', accent: '#cbd5e1', border: '#475569' },
    blue: { bg: 'linear-gradient(to bottom, #1e40af, #1e3a8a)', accent: '#93c5fd', border: '#3b82f6' },
    violet: { bg: 'linear-gradient(to bottom, #6d28d9, #5b21b6)', accent: '#c4b5fd', border: '#8b5cf6' },
    emerald: { bg: 'linear-gradient(to bottom, #047857, #065f46)', accent: '#6ee7b7', border: '#10b981' },
    rose: { bg: 'linear-gradient(to bottom, #be123c, #9f1239)', accent: '#fda4af', border: '#f43f5e' },
    amber: { bg: 'linear-gradient(to bottom, #b45309, #92400e)', accent: '#fcd34d', border: '#f59e0b' },
  };

  const colors = colorMap[sidebarColor] || colorMap.slate;

  if (template === 'modern') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #1e293b;
              background: white;
            }
            .container {
              display: flex;
              min-height: 100vh;
            }
            .sidebar {
              width: 35%;
              background: ${colors.bg};
              color: white;
              padding: 40px 30px;
            }
            .main-content {
              width: 65%;
              padding: 40px;
            }
            .photo-container {
              text-align: center;
              margin-bottom: 30px;
            }
            .photo {
              width: 160px;
              height: 160px;
              border-radius: 50%;
              object-fit: cover;
              border: 4px solid rgba(255, 255, 255, 0.2);
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            .sidebar-section {
              margin-bottom: 30px;
            }
            .sidebar-heading {
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: ${colors.accent};
              margin-bottom: 15px;
              padding-bottom: 8px;
              border-bottom: 1px solid ${colors.border};
              opacity: 0.9;
            }
            .contact-item {
              display: flex;
              align-items: flex-start;
              gap: 10px;
              margin-bottom: 12px;
              font-size: 13px;
            }
            .contact-icon {
              color: ${colors.accent};
              flex-shrink: 0;
            }
            .skill-item {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 10px;
              font-size: 13px;
            }
            .skill-dot {
              width: 8px;
              height: 8px;
              background: ${colors.accent};
              border-radius: 50%;
              flex-shrink: 0;
            }
            .cert-item {
              display: flex;
              align-items: flex-start;
              gap: 8px;
              margin-bottom: 10px;
              font-size: 13px;
            }
            .cert-bullet {
              color: ${colors.accent};
              flex-shrink: 0;
            }
            .header {
              margin-bottom: 30px;
            }
            h1 {
              font-size: 42px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 8px;
            }
            .title {
              font-size: 18px;
              color: #64748b;
              font-weight: 500;
              margin-bottom: 20px;
            }
            .section {
              margin-bottom: 35px;
            }
            h2 {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 8px;
            }
            .summary {
              color: #475569;
              line-height: 1.8;
              font-size: 14px;
            }
            .experience-item {
              margin-bottom: 25px;
            }
            .experience-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              align-items: flex-start;
            }
            .job-title {
              font-weight: 700;
              font-size: 16px;
              color: #0f172a;
            }
            .company {
              color: #64748b;
              font-size: 14px;
              margin-top: 2px;
            }
            .date {
              color: #64748b;
              font-size: 13px;
              white-space: nowrap;
              font-style: italic;
            }
            ul {
              margin-left: 20px;
              margin-top: 8px;
            }
            li {
              color: #475569;
              font-size: 13px;
              margin-bottom: 6px;
              line-height: 1.6;
            }
            .education-item {
              margin-bottom: 20px;
            }
            .degree {
              font-weight: 700;
              font-size: 15px;
              color: #0f172a;
            }
            .school {
              color: #64748b;
              font-size: 14px;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Sidebar -->
            <div class="sidebar">
              ${personalInfo.photo ? `
                <div class="photo-container">
                  <img src="${personalInfo.photo}" alt="${personalInfo.name}" class="photo" />
                </div>
              ` : ''}

              <!-- Contact -->
              <div class="sidebar-section">
                <h3 class="sidebar-heading">Contact</h3>
                <div class="contact-item">
                  <span class="contact-icon">📧</span>
                  <span>${personalInfo.email}</span>
                </div>
                <div class="contact-item">
                  <span class="contact-icon">📱</span>
                  <span>${personalInfo.phone}</span>
                </div>
                <div class="contact-item">
                  <span class="contact-icon">📍</span>
                  <span>${personalInfo.location}</span>
                </div>
                ${personalInfo.linkedin ? `
                  <div class="contact-item">
                    <span class="contact-icon">💼</span>
                    <span style="font-size: 11px;">${personalInfo.linkedin}</span>
                  </div>
                ` : ''}
                ${personalInfo.website ? `
                  <div class="contact-item">
                    <span class="contact-icon">🌐</span>
                    <span style="font-size: 11px;">${personalInfo.website}</span>
                  </div>
                ` : ''}
              </div>

              <!-- Skills -->
              ${skills.length > 0 ? `
                <div class="sidebar-section">
                  <h3 class="sidebar-heading">Skills</h3>
                  ${skills.map((skill: string) => `
                    <div class="skill-item">
                      <div class="skill-dot"></div>
                      <span>${skill}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- Certifications -->
              ${certifications && certifications.length > 0 ? `
                <div class="sidebar-section">
                  <h3 class="sidebar-heading">Certifications</h3>
                  ${certifications.map((cert: string) => `
                    <div class="cert-item">
                      <span class="cert-bullet">✓</span>
                      <span>${cert}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Main Content -->
            <div class="main-content">
              <div class="header">
                <h1>${personalInfo.name}</h1>
                ${personalInfo.title ? `<div class="title">${personalInfo.title}</div>` : ''}
              </div>

              ${summary ? `
                <div class="section">
                  <h2>Professional Summary</h2>
                  <p class="summary">${summary}</p>
                </div>
              ` : ''}

              ${experience.length > 0 ? `
                <div class="section">
                  <h2>Experience</h2>
                  ${experience.map((exp: any) => `
                    <div class="experience-item">
                      <div class="experience-header">
                        <div>
                          <div class="job-title">${exp.title}</div>
                          <div class="company">${exp.company} • ${exp.location}</div>
                        </div>
                        <div class="date">${exp.startDate} - ${exp.endDate}</div>
                      </div>
                      <ul>
                        ${exp.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
                      </ul>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${education.length > 0 ? `
                <div class="section">
                  <h2>Education & Training</h2>
                  ${education.map((edu: any) => `
                    <div class="education-item">
                      <div class="experience-header">
                        <div>
                          <div class="degree">${edu.degree}</div>
                          <div class="school">${edu.school} • ${edu.location}</div>
                        </div>
                        <div class="date">${edu.years}</div>
                      </div>
                      ${edu.details.length > 0 ? `
                        <ul>
                          ${edu.details.map((detail: string) => `<li>${detail}</li>`).join('')}
                        </ul>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;
  }

  return '<html><body><p>Template not found</p></body></html>';
}
