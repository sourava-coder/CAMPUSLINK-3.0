import type { Student, Job } from './supabase';

export type FitBreakdown = {
  cgpa: number;
  skills: number;
  projects: number;
  internship: number;
  communication: number;
  certifications: number;
  aptitude: number;
  total: number;
};

export type MatchResult = {
  fitScore: number;
  breakdown: FitBreakdown;
  skillGaps: string[];
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string[];
};

const SKILL_WEIGHT = 10;
const MAX_SKILL_SCORE = 50;

export function calculateFitScore(student: Student, job: Job): MatchResult {
  const explanation: string[] = [];
  const breakdown: FitBreakdown = {
    cgpa: 0,
    skills: 0,
    projects: 0,
    internship: 0,
    communication: 0,
    certifications: 0,
    aptitude: 0,
    total: 0,
  };

  // CGPA check
  if (student.cgpa >= job.min_cgpa) {
    breakdown.cgpa = 15;
    explanation.push(`CGPA ${student.cgpa} meets minimum ${job.min_cgpa} +15`);
  } else {
    breakdown.cgpa = Math.round((student.cgpa / job.min_cgpa) * 10);
    explanation.push(`CGPA ${student.cgpa} below minimum ${job.min_cgpa} +${breakdown.cgpa}`);
  }

  // Skills matching
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];
  let skillScore = 0;

  for (const req of job.required_skills) {
    if (student.skills.includes(req)) {
      const level = student.skill_levels[req] || 'intermediate';
      const levelMultiplier = level === 'advanced' ? 1.0 : level === 'intermediate' ? 0.7 : 0.4;
      const points = Math.round(SKILL_WEIGHT * levelMultiplier);
      skillScore += points;
      matchedSkills.push(req);
      explanation.push(`${req} (${level}) +${points}`);
    } else {
      missingSkills.push(req);
      explanation.push(`Missing required skill: ${req}`);
    }
  }

  for (const pref of job.preferred_skills) {
    if (student.skills.includes(pref) && !matchedSkills.includes(pref)) {
      const level = student.skill_levels[pref] || 'intermediate';
      const levelMultiplier = level === 'advanced' ? 0.8 : level === 'intermediate' ? 0.5 : 0.3;
      const points = Math.round(SKILL_WEIGHT * levelMultiplier);
      skillScore += points;
      matchedSkills.push(pref);
      explanation.push(`${pref} (preferred, ${level}) +${points}`);
    }
  }

  breakdown.skills = Math.min(skillScore, MAX_SKILL_SCORE);

  // Projects (max 15)
  breakdown.projects = Math.min(student.projects * 4, 15);
  if (student.projects > 0) {
    explanation.push(`${student.projects} relevant projects +${breakdown.projects}`);
  }

  // Internship (max 10)
  breakdown.internship = student.internships > 0 ? 10 : 0;
  if (student.internships > 0) {
    explanation.push(`${student.internships} internship(s) +10`);
  }

  // Communication (max 5)
  breakdown.communication = Math.round((student.communication_score / 100) * 5);
  explanation.push(`Communication ${student.communication_score}/100 +${breakdown.communication}`);

  // Certifications (max 5)
  breakdown.certifications = Math.min(student.certifications.length * 2, 5);
  if (student.certifications.length > 0) {
    explanation.push(`${student.certifications.length} certification(s) +${breakdown.certifications}`);
  }

  // Aptitude (max 5)
  breakdown.aptitude = Math.round((student.aptitude_score / 100) * 5);
  explanation.push(`Aptitude ${student.aptitude_score}/100 +${breakdown.aptitude}`);

  breakdown.total =
    breakdown.cgpa +
    breakdown.skills +
    breakdown.projects +
    breakdown.internship +
    breakdown.communication +
    breakdown.certifications +
    breakdown.aptitude;

  if (missingSkills.length > 0) {
    explanation.push(`Missing: ${missingSkills.join(', ')}`);
  }

  return {
    fitScore: Math.min(breakdown.total, 100),
    breakdown,
    skillGaps: missingSkills,
    matchedSkills,
    missingSkills,
    explanation,
  };
}

export type ReadinessResult = {
  overall: number;
  technical: number;
  aptitude: number;
  communication: number;
  resume: number;
  interview: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
};

export function calculateReadiness(student: Student): ReadinessResult {
  const technical = Math.min(
    Math.round((student.skills.length / 6) * 50 + (student.projects / 5) * 30 + (student.certifications.length / 3) * 20),
    100
  );
  const aptitude = student.aptitude_score;
  const communication = student.communication_score;
  const resume = student.resume_quality;
  const interview = student.interview_readiness;

  const overall = Math.round(
    technical * 0.3 +
    aptitude * 0.2 +
    communication * 0.2 +
    resume * 0.15 +
    interview * 0.15
  );

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (overall < 60) riskLevel = 'high';
  else if (overall < 75) riskLevel = 'medium';

  const recommendations: string[] = [];
  if (aptitude < 70) recommendations.push('Improve aptitude scores with daily practice tests');
  if (communication < 70) recommendations.push('Enhance communication skills through mock interviews');
  if (technical < 70) recommendations.push('Build more technical projects to strengthen skills');
  if (student.backlogs > 0) recommendations.push(`Clear ${student.backlogs} active backlog(s) urgently`);
  if (resume < 75) recommendations.push('Improve resume quality — add projects and certifications');
  if (interview < 70) recommendations.push('Practice technical interview problems regularly');
  if (recommendations.length === 0) recommendations.push('Maintain current performance — you are placement-ready');

  return {
    overall,
    technical,
    aptitude,
    communication,
    resume,
    interview,
    riskLevel,
    recommendations,
  };
}

export function generateLearningPath(missingSkills: string[]): string[] {
  const path: string[] = [];
  const weekMap: Record<string, string> = {
    'Spring Boot': 'Week 1: Master Spring Boot fundamentals — REST APIs, dependency injection, and configuration',
    'AWS': 'Week 2: Learn AWS basics — EC2, S3, IAM, and cloud deployment',
    'Docker': 'Week 3: Docker essentials — containerization, images, and orchestration',
    'Kubernetes': 'Week 4: Kubernetes basics — pods, services, and deployments',
    'TensorFlow': 'Week 4: TensorFlow fundamentals — model building and training',
    'Machine Learning': 'Week 3: ML essentials — supervised learning and model evaluation',
    'Microservices': 'Week 4: Microservices architecture — service decomposition and communication',
    'React': 'Week 1: React fundamentals — components, hooks, and state management',
    'Node.js': 'Week 2: Node.js backend — Express, REST APIs, and middleware',
    'MongoDB': 'Week 3: MongoDB — data modeling, queries, and aggregation',
    'Azure': 'Week 2: Azure cloud — VMs, storage, and app services',
    'Terraform': 'Week 4: Infrastructure as Code with Terraform',
    'Redis': 'Week 3: Redis caching — data structures and performance',
    'Kafka': 'Week 4: Apache Kafka — event streaming and messaging',
    'R': 'Week 3: R programming — statistical analysis and data visualization',
    'Statistics': 'Week 2: Statistics — probability, distributions, and hypothesis testing',
  };

  for (const skill of missingSkills.slice(0, 4)) {
    path.push(weekMap[skill] || `Week ${path.length + 1}: Learn ${skill} — fundamentals and practical projects`);
  }

  if (path.length === 0) {
    path.push('You have all required skills. Focus on interview preparation and project polish.');
  }

  return path;
}

export type CopilotResponse = {
  text: string;
  data?: unknown;
};

export function generateCopilotResponse(
  query: string,
  students: Student[],
  jobs: Job[],
  applications: { student: Student; job: Job; status: string; fit_score: number }[]
): CopilotResponse {
  const q = query.toLowerCase().trim();

  // Students at risk
  if (q.includes('risk') || q.includes('at risk') || q.includes('struggling')) {
    const atRisk = students.filter(s => s.risk_level === 'high' || s.risk_level === 'medium');
    const high = students.filter(s => s.risk_level === 'high');
    const commonGaps: Record<string, number> = {};
    atRisk.forEach(s => {
      const readiness = calculateReadiness(s);
      if (readiness.aptitude < 70) commonGaps['aptitude'] = (commonGaps['aptitude'] || 0) + 1;
      if (readiness.communication < 70) commonGaps['communication'] = (commonGaps['communication'] || 0) + 1;
      if (readiness.technical < 70) commonGaps['technical skills'] = (commonGaps['technical skills'] || 0) + 1;
      if (readiness.interview < 70) commonGaps['interview prep'] = (commonGaps['interview prep'] || 0) + 1;
    });
    const topGaps = Object.entries(commonGaps).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return {
      text: `${atRisk.length} students currently show elevated placement risk (${high.length} high risk, ${atRisk.length - high.length} medium risk). The most common gaps are: ${topGaps.map(g => `${g[0]} (${g[1]} students)`).join(', ')}. I recommend scheduling targeted training sessions for these areas.`,
      data: atRisk,
    };
  }

  // Students suitable for a role
  if (q.includes('suitable') || q.includes('match') || q.includes('recommend') || q.includes('eligible')) {
    const jobMatch = jobs.find(j => q.includes(j.title.toLowerCase()) || q.includes(j.title.toLowerCase().split(' ')[0]));
    if (jobMatch) {
      const matches = students
        .map(s => ({ student: s, result: calculateFitScore(s, jobMatch) }))
        .filter(m => m.result.fitScore >= 50)
        .sort((a, b) => b.result.fitScore - a.result.fitScore);
      const strong = matches.filter(m => m.result.fitScore >= 85);
      return {
        text: `${matches.length} students match the ${jobMatch.title} role at ${jobMatch.company?.name || 'the company'}. ${strong.length} have a fit score above 85%. Top candidates: ${matches.slice(0, 5).map(m => `${m.student.name} (${m.result.fitScore}%)`).join(', ')}.`,
        data: matches,
      };
    }
    return {
      text: `I can match students to specific roles. Try asking "Show me students suitable for the Software Developer role" or "Which students match the SDE-I position?"`,
    };
  }

  // Why wasn't a student recommended
  if (q.includes('why') && q.includes('not')) {
    return {
      text: `I can explain why a specific student wasn't recommended for a role. Try asking "Why wasn't Rahul recommended for the Amazon SDE-I role?" — I'll analyze their CGPA, skills, and assessment scores against the job requirements.`,
    };
  }

  // Placement statistics
  if (q.includes('statistic') || q.includes('overview') || q.includes('summary') || q.includes('how many')) {
    const total = students.length;
    const placed = students.filter(s => s.status === 'placed').length;
    const rate = total > 0 ? Math.round((placed / total) * 100) : 0;
    const avgPackage = students.filter(s => s.placed_package).reduce((a, s) => a + (s.placed_package || 0), 0) / (placed || 1);
    const highest = Math.max(...students.map(s => s.placed_package || 0), 0);
    return {
      text: `Current placement overview: ${total} students total, ${placed} placed (${rate}% placement rate). Average package: ₹${avgPackage.toFixed(1)} LPA. Highest package: ₹${highest} LPA. ${jobs.length} active job openings from ${new Set(jobs.map(j => j.company_id)).size} companies.`,
    };
  }

  // Skill gaps
  if (q.includes('skill gap') || q.includes('missing skill') || q.includes('gap')) {
    const allGaps: Record<string, number> = {};
    students.forEach(s => {
      jobs.forEach(j => {
        if (s.skills.length > 0 && s.cgpa >= j.min_cgpa) {
          j.required_skills.forEach(r => {
            if (!s.skills.includes(r)) {
              allGaps[r] = (allGaps[r] || 0) + 1;
            }
          });
        }
      });
    });
    const topGaps = Object.entries(allGaps).sort((a, b) => b[1] - a[1]).slice(0, 5);
    return {
      text: `Most common skill gaps across students: ${topGaps.map(g => `${g[0]} (${g[1]} students missing)`).join(', ')}. I recommend organizing workshops for the top 3 gaps to improve placement readiness.`,
      data: topGaps,
    };
  }

  // Scheduling conflicts
  if (q.includes('conflict') || q.includes('schedule') || q.includes('scheduling')) {
    return {
      text: `I can detect scheduling conflicts when students have overlapping interviews or tests. Navigate to the Smart Scheduler tab to see all detected conflicts and suggested alternative time slots.`,
    };
  }

  // Active drives
  if (q.includes('drive') || q.includes('active') || q.includes('opening')) {
    const activeJobs = jobs.filter(j => j.status === 'active');
    return {
      text: `There are ${activeJobs.length} active placement drives: ${activeJobs.map(j => `${j.title} at ${j.company?.name || 'company'} (₹${j.package_lpa} LPA)`).join('; ')}.`,
      data: activeJobs,
    };
  }

  // Help / default
  return {
    text: `I'm your CampusLink AI Copilot. I can help you with:
• "Show me students at risk of not getting placed"
• "Which students are suitable for the Software Developer role?"
• "What are the most common skill gaps?"
• "Give me a placement overview"
• "How many active drives are there?"
• "Why wasn't a student recommended for a role?"

Ask me anything about your placement data!`,
  };
}
