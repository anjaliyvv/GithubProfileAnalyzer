/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { Github, Search, Users, BookOpen } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, AreaChart, Area, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function App() {
  const [username, setUsername] = useState('');
  const [profile, setProfile] = useState<any>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [events, setEvents] = useState<any[]>([]);

  const analyzeProfile = async () => {
    if (!username) return;
    setLoading(true);
    setError('');
    setProfile(null);
    setRepos([]);
    setEvents([]);

    try {
      const [profileRes, reposRes, eventsRes] = await Promise.all([
        fetch(`/api/github/${username}`),
        fetch(`/api/github/${username}/repos`),
        fetch(`/api/github/${username}/events`)
      ]);
      
      if (!profileRes.ok) throw new Error('User not found');
      if (!reposRes.ok) throw new Error('Failed to fetch repositories');
      if (!eventsRes.ok) throw new Error('Failed to fetch events');
      
      const profileData = await profileRes.json();
      const reposData = await reposRes.json();
      const eventsData = await eventsRes.json();
      
      setProfile(profileData);
      setRepos(reposData);
      setEvents(eventsData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const contributionStats = events.filter(e => e.type === 'PushEvent').reduce((acc, event) => {
    const date = new Date(event.created_at);
    const day = date.toDateString();
    const hour = date.getHours();
    
    acc.daily[day] = (acc.daily[day] || 0) + 1;
    acc.hours[hour] = (acc.hours[hour] || 0) + 1;
    acc.total++;
    return acc;
  }, { daily: {}, hours: {}, total: 0 });

  // Streak Calculation
  const sortedDays = Object.keys(contributionStats.daily).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  if (sortedDays.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if today or yesterday has a commit to start streak
    let lastDate = new Date(sortedDays[0]);
    lastDate.setHours(0, 0, 0, 0);
    
    if (today.getTime() - lastDate.getTime() <= 86400000 * 2) {
      // Calculate streaks
      let streak = 0;
      let prevDate = new Date(sortedDays[0]);
      
      for (let i = 0; i < sortedDays.length; i++) {
        const currDate = new Date(sortedDays[i]);
        if (i === 0 || (prevDate.getTime() - currDate.getTime() === 86400000)) {
          streak++;
        } else {
          longestStreak = Math.max(longestStreak, streak);
          streak = 1;
        }
        prevDate = currDate;
      }
      longestStreak = Math.max(longestStreak, streak);
      currentStreak = (today.getTime() - lastDate.getTime() <= 86400000) ? streak : 0; // Simplified
    }
  }

  const peakHour = Object.entries(contributionStats.hours).sort((a: any, b: any) => b[1] - a[1])[0]?.[0];
  const mostProductiveDay = Object.entries(contributionStats.daily).sort((a: any, b: any) => b[1] - a[1])[0]?.[0];

  const PREDEFINED_CATEGORIES = ['Frontend', 'Backend', 'Systems', 'Mobile', 'AI/ML', 'DevOps', 'Data'];
  
  const languageCategories: Record<string, string> = {
    'TypeScript': 'Frontend', 'JavaScript': 'Frontend', 'HTML': 'Frontend', 'CSS': 'Frontend', 'Vue': 'Frontend', 'Svelte': 'Frontend', 'React': 'Frontend',
    'Java': 'Backend', 'Python': 'Backend', 'Go': 'Backend', 'Ruby': 'Backend', 'PHP': 'Backend', 'C#': 'Backend', 'Elixir': 'Backend',
    'Rust': 'Systems', 'C++': 'Systems', 'C': 'Systems', 'Assembly': 'Systems', 'Zig': 'Systems',
    'Swift': 'Mobile', 'Kotlin': 'Mobile', 'Dart': 'Mobile', 'Objective-C': 'Mobile',
    'Jupyter Notebook': 'AI/ML', 'R': 'AI/ML', 'Julia': 'AI/ML',
    'Dockerfile': 'DevOps', 'Shell': 'DevOps', 'Makefile': 'DevOps', 'HCL': 'DevOps', 'Nix': 'DevOps',
    'SQL': 'Data', 'PLpgSQL': 'Data', 'TSQL': 'Data',
  };

  const enrichedRepos = repos.map(repo => {
    let score = 0;
    // Documentation & Community
    if (repo.description) score += 10;
    if (repo.has_wiki) score += 10;
    if (repo.has_pages) score += 10;
    if (repo.homepage) score += 10;
    
    // Maintainability & Best Practices
    if (repo.license) score += 20;
    if (!repo.archived && !repo.disabled) score += 10;
    
    const lastUpdated = new Date(repo.updated_at).getTime();
    const threeMonthsAgo = Date.now() - 3 * 30 * 24 * 60 * 60 * 1000;
    const sixMonthsAgo = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000;
    if (lastUpdated > threeMonthsAgo) score += 20;
    else if (lastUpdated > sixMonthsAgo) score += 10;

    // Issue Management
    if (repo.has_issues) {
      if (repo.open_issues_count === 0) score += 10;
      else if (repo.stargazers_count > 0 && repo.open_issues_count / repo.stargazers_count < 0.2) score += 10;
    } else {
      score += 10;
    }

    return { ...repo, healthScore: Math.min(100, score) };
  });

  const repoStats = enrichedRepos.reduce((acc, repo) => {
    const lang = repo.language || 'Other';
    const category = languageCategories[lang] || 'Other';

    return {
      totalStars: acc.totalStars + (repo.stargazers_count || 0),
      totalForks: acc.totalForks + (repo.forks_count || 0),
      totalOpenIssues: acc.totalOpenIssues + (repo.open_issues_count || 0),
      totalWatchers: acc.totalWatchers + (repo.watchers_count || 0),
      totalSize: acc.totalSize + (repo.size || 0),
      languages: { ...acc.languages, [lang]: (acc.languages[lang] || 0) + 1 },
      categories: { ...acc.categories, [category]: (acc.categories[category] || 0) + 1 },
      licenses: { ...acc.licenses, [repo.license?.spdx_id || 'None']: (acc.licenses[repo.license?.spdx_id || 'None'] || 0) + 1 },
      archivedCount: acc.archivedCount + (repo.archived ? 1 : 0),
      totalScore: acc.totalScore + repo.healthScore,
    };
  }, {
    totalStars: 0,
    totalForks: 0,
    totalOpenIssues: 0,
    totalWatchers: 0,
    totalSize: 0,
    languages: {} as Record<string, number>,
    categories: {} as Record<string, number>,
    licenses: {} as Record<string, number>,
    archivedCount: 0,
    totalScore: 0,
  });

  const averageQualityScore = enrichedRepos.length > 0 ? (repoStats.totalScore / enrichedRepos.length).toFixed(1) : 0;

  const pieData = Object.entries(repoStats.categories).map(([name, value]) => ({ name, value }));
  const barData = Object.entries(repoStats.languages)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 10);
  
  const maxCategoryValue = Math.max(...PREDEFINED_CATEGORIES.map(c => repoStats.categories[c] || 0), 1);
  const radarData = PREDEFINED_CATEGORIES.map(cat => ({
    subject: cat,
    A: repoStats.categories[cat] || 0,
    fullMark: maxCategoryValue
  }));

  const COLORS = ['#FF5C00', '#1A1A1A', '#666666', '#999999', '#CCCCCC', '#333333', '#E5E5E5', '#888888'];

  const dailyEvents = events.filter(e => e.type === 'PushEvent').reduce((acc, e) => {
    const d = new Date(e.created_at).toLocaleDateString();
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const commitTrendData = Object.entries(dailyEvents).map(([date, count]) => ({ date, count })).reverse();

  const hourlyEvents = events.filter(e => e.type === 'PushEvent').reduce((acc, e) => {
    const h = new Date(e.created_at).getHours();
    acc[h] = (acc[h] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  const productivityData = Array.from({length: 24}, (_, i) => ({ hour: `${i}:00`, commits: hourlyEvents[i] || 0 }));

  const repoCreationData = repos.reduce((acc, r) => {
    const year = new Date(r.created_at).getFullYear();
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const creationTimeline = Object.entries(repoCreationData).map(([year, count]) => ({ year, count })).sort((a,b)=> Number(a.year) - Number(b.year));

  const todayForHeatmap = new Date();
  todayForHeatmap.setHours(0,0,0,0);
  
  const daysToInclude = 90;
  const startDate = new Date(todayForHeatmap);
  startDate.setDate(startDate.getDate() - daysToInclude);
  
  while (startDate.getDay() !== 0) {
    startDate.setDate(startDate.getDate() - 1);
  }

  const heatmapGrid: any[][] = [];
  let currentWeek: any[] = [];
  
  const currentDateIter = new Date(startDate);
  while (currentDateIter <= todayForHeatmap || currentDateIter.getDay() !== 0) {
    if (currentWeek.length === 7) {
      heatmapGrid.push(currentWeek);
      currentWeek = [];
    }
    
    if (currentDateIter > todayForHeatmap) {
       currentWeek.push(null);
    } else {
       const dateStr = currentDateIter.toLocaleDateString();
       currentWeek.push({
         date: dateStr,
         count: dailyEvents[dateStr] || 0
       });
    }
    currentDateIter.setDate(currentDateIter.getDate() + 1);
  }
  if (currentWeek.length > 0) {
    while(currentWeek.length < 7) currentWeek.push(null);
    heatmapGrid.push(currentWeek);
  }

  const getHeatmapColor = (count: number) => {
    if (count === 0) return 'bg-gray-200';
    if (count < 2) return 'bg-[#FF5C00] opacity-40';
    if (count < 5) return 'bg-[#FF5C00] opacity-60';
    if (count < 10) return 'bg-[#FF5C00] opacity-80';
    return 'bg-[#FF5C00]';
  };

  return (
    <div className="w-full h-screen bg-[#F4F4F1] text-[#1A1A1A] flex flex-col font-sans overflow-hidden">
      {/* Header Navigation */}
      <header className="flex items-center justify-between px-10 py-8 border-b border-[#1A1A1A] shrink-0">
        <div className="text-xs font-bold tracking-[0.3em] uppercase hidden md:block">Git.Valuation / 2024</div>
        <div className="flex items-center gap-4 md:gap-12 w-full md:w-auto justify-between md:justify-end">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ENTER USERNAME"
            className="bg-transparent border-b-2 border-[#1A1A1A] text-sm font-bold uppercase tracking-widest focus:outline-none pb-1 w-48 md:w-64 placeholder-gray-400"
            onKeyDown={(e) => e.key === 'Enter' && analyzeProfile()}
          />
          <button
            onClick={analyzeProfile}
            disabled={loading}
            className="px-6 py-2 border border-[#1A1A1A] text-xs font-bold uppercase hover:bg-[#1A1A1A] hover:text-white cursor-pointer transition-colors"
          >
            {loading ? 'ANALYZING...' : 'NEW ANALYSIS'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {error && (
          <div className="p-10 bg-[#FF5C00] text-white font-bold uppercase tracking-widest text-center border-b border-[#1A1A1A]">
             {error}
          </div>
        )}

        {!profile && !loading && !error && (
           <div className="flex-1 flex items-center justify-center p-10 opacity-10 select-none">
             <h1 className="text-[60px] md:text-[140px] leading-[0.85] font-black uppercase tracking-tighter text-center">
                GITHUB<br/>ANALYZER
             </h1>
           </div>
        )}

        {profile && (
          <>
            <div className="flex flex-col lg:flex-row border-b border-[#1A1A1A]">
              {/* Left: Massive Typography Profile */}
              <div className="w-full lg:w-2/3 p-10 flex flex-col justify-between border-r-0 lg:border-r border-[#1A1A1A] border-b lg:border-b-0">
                <div className="space-y-[-10px]">
                  <h1 className="text-[80px] md:text-[120px] xl:text-[140px] leading-[0.85] font-black uppercase tracking-tighter break-words">
                    {profile.name?.split(' ')[0] || profile.login}<br/>
                    {profile.name?.split(' ').slice(1).join(' ') || ''}
                  </h1>
                  <p className="text-xl font-medium mt-6 max-w-md opacity-80">{profile.bio}</p>
                </div>
                
                <div className="flex items-end gap-8 mt-12 lg:mt-0">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-[#FF5C00] rounded-full flex items-center justify-center overflow-hidden border-4 border-[#1A1A1A] shrink-0">
                     <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div className="pb-4">
                    <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-2">User Tier</div>
                    <div className="text-2xl font-bold uppercase">
                      {Number(averageQualityScore) > 80 ? 'Elite Contributor' : Number(averageQualityScore) > 50 ? 'Active Developer' : 'Casual Coder'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Primary Stats Column */}
              <div className="w-full lg:w-1/3 flex flex-col">
                <div className="flex-1 p-10 border-b border-[#1A1A1A]">
                  <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-6">Total Influence</div>
                  <div className="text-6xl md:text-8xl font-black italic tracking-tighter">{repoStats.totalStars}</div>
                  <div className="text-sm font-bold uppercase mt-2">Stars Earned / All Repos</div>
                </div>
                <div className="flex-1 p-10 flex flex-col justify-center">
                  <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-6">Core Stack</div>
                  <div className="space-y-4">
                    {barData.slice(0, 2).map((lang, idx) => (
                      <div key={idx}>
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold uppercase italic">{lang.name}</span>
                          <span className="text-xl font-black">{Math.round(((lang.value as number) / Math.max(repos.length, 1)) * 100)}%</span>
                        </div>
                        <div className="h-[2px] w-full bg-[#1A1A1A] bg-opacity-10 mt-1">
                          <div className={`h-full ${idx === 0 ? 'bg-[#FF5C00]' : 'bg-[#1A1A1A]'}`} style={{ width: `${Math.min(100, Math.round(((lang.value as number) / Math.max(repos.length, 1)) * 100))}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Metrics Grid */}
            <div className="flex flex-col md:flex-row border-b border-[#1A1A1A]">
              <div className="flex-1 border-r border-[#1A1A1A] p-8 flex flex-col justify-between border-b md:border-b-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">Contributions (90d)</span>
                <div className="text-5xl font-black italic tracking-tighter mt-4">{contributionStats.total}</div>
              </div>
              <div className="flex-1 border-r border-[#1A1A1A] p-8 flex flex-col justify-between border-b md:border-b-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">Current Streak</span>
                <div className="text-5xl font-black italic tracking-tighter mt-4">{currentStreak}</div>
              </div>
              <div className="flex-1 border-r border-[#1A1A1A] p-8 flex flex-col justify-between border-b md:border-b-0">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-40">Followers</span>
                <div className="text-5xl font-black italic tracking-tighter mt-4">{profile.followers}</div>
              </div>
              <div className="flex-1 p-8 bg-[#1A1A1A] text-white flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-60">System Status</span>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-3 h-3 rounded-full bg-[#FF5C00]"></div>
                  <div className="text-3xl font-black italic">ACTIVE</div>
                </div>
                <span className="text-[10px] font-bold uppercase mt-2 opacity-50">Data Sync: Just now</span>
              </div>
            </div>

            {/* Heatmap Section */}
            <div className="p-10 border-b border-[#1A1A1A]">
              <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-8">Activity Matrix</div>
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-1 min-w-max">
                  <div className="flex flex-col gap-1 pr-4 text-[8px] uppercase font-bold opacity-40 text-right w-10 mt-5">
                     <span className="h-3 md:h-4"></span>
                     <span className="h-3 md:h-4 flex items-center justify-end">Mon</span>
                     <span className="h-3 md:h-4"></span>
                     <span className="h-3 md:h-4 flex items-center justify-end">Wed</span>
                     <span className="h-3 md:h-4"></span>
                     <span className="h-3 md:h-4 flex items-center justify-end">Fri</span>
                     <span className="h-3 md:h-4"></span>
                  </div>
                  {heatmapGrid.map((week, wIdx) => {
                    const firstDay = week.find(d => d);
                    const monthName = firstDay && new Date(firstDay.date).getDate() <= 7 
                      ? new Date(firstDay.date).toLocaleString('default', { month: 'short' }) 
                      : '';
                    return (
                      <div key={wIdx} className="flex flex-col gap-1">
                        <div className="h-4 text-[10px] uppercase font-bold opacity-40 mb-1">{monthName}</div>
                        {week.map((day, dIdx) => (
                          day ? (
                            <div 
                              key={dIdx} 
                              title={`${day.date}: ${day.count} contributions`}
                              className={`w-3 h-3 md:w-4 md:h-4 ${getHeatmapColor(day.count)} border border-[#1A1A1A] border-opacity-10 transition-transform hover:scale-125`}
                            />
                          ) : (
                            <div key={dIdx} className="w-3 h-3 md:w-4 md:h-4 bg-transparent" />
                          )
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Analytics Grid */}
            <div className="flex flex-col lg:flex-row border-b border-[#1A1A1A]">
               <div className="flex-1 p-10 border-r-0 lg:border-r border-b lg:border-b-0 border-[#1A1A1A]">
                  <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-8">Tech Stack Breakdown</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={120} fill="#8884d8" stroke="#1A1A1A" strokeWidth={2}>
                        {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 0, textTransform: 'uppercase', fontWeight: 'bold' }} />
                    </PieChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex-1 p-10 border-r-0 lg:border-r border-b lg:border-b-0 border-[#1A1A1A]">
                  <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-8">Skill Radar</div>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart cx="50%" cy="50%" outerRadius={100} data={radarData}>
                      <PolarGrid stroke="#1A1A1A" strokeOpacity={0.2} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#1A1A1A', fontSize: 10, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                      <Radar name="Expertise" dataKey="A" stroke="#FF5C00" fill="#FF5C00" fillOpacity={0.3} strokeWidth={2} />
                      <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 0, textTransform: 'uppercase', fontWeight: 'bold' }} />
                    </RadarChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex-1 p-10">
                  <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-8">Top Languages</div>
                  <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={barData}>
                       <XAxis dataKey="name" hide />
                       <YAxis tick={{ fill: '#1A1A1A', fontWeight: 'bold' }} axisLine={{ stroke: '#1A1A1A' }} tickLine={false} />
                       <Tooltip cursor={{ fill: '#000', opacity: 0.05 }} contentStyle={{ backgroundColor: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 0, textTransform: 'uppercase', fontWeight: 'bold' }} />
                       <Bar dataKey="value" fill="#1A1A1A" />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="flex flex-col lg:flex-row border-b border-[#1A1A1A]">
               <div className="flex-1 p-10 border-r-0 lg:border-r border-b lg:border-b-0 border-[#1A1A1A]">
                  <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-8">Productivity Timeline (Commits / Hour)</div>
                  <ResponsiveContainer width="100%" height={300}>
                     <LineChart data={productivityData}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" opacity={0.1} vertical={false} />
                       <XAxis dataKey="hour" tick={{ fill: '#1A1A1A', fontWeight: 'bold', fontSize: 10 }} axisLine={{ stroke: '#1A1A1A' }} tickLine={false} />
                       <YAxis tick={{ fill: '#1A1A1A', fontWeight: 'bold' }} axisLine={{ stroke: '#1A1A1A' }} tickLine={false} />
                       <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 0, textTransform: 'uppercase', fontWeight: 'bold' }} />
                       <Line type="monotone" dataKey="commits" stroke="#FF5C00" strokeWidth={4} dot={false} activeDot={{ r: 8, fill: '#FF5C00', stroke: '#1A1A1A', strokeWidth: 2 }} />
                     </LineChart>
                  </ResponsiveContainer>
               </div>
               <div className="flex-1 p-10">
                  <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-8">Repository Creation Timeline</div>
                  <ResponsiveContainer width="100%" height={300}>
                     <BarChart data={creationTimeline}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" opacity={0.1} vertical={false} />
                       <XAxis dataKey="year" tick={{ fill: '#1A1A1A', fontWeight: 'bold' }} axisLine={{ stroke: '#1A1A1A' }} tickLine={false} />
                       <YAxis tick={{ fill: '#1A1A1A', fontWeight: 'bold' }} axisLine={{ stroke: '#1A1A1A' }} tickLine={false} />
                       <Tooltip cursor={{ fill: '#000', opacity: 0.05 }} contentStyle={{ backgroundColor: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 0, textTransform: 'uppercase', fontWeight: 'bold' }} />
                       <Bar dataKey="count" fill="#1A1A1A" />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

             {/* Top Repositories Grid */}
            <div className="p-10 border-b border-[#1A1A1A] bg-[#E5E5E5]">
               <div className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-40 mb-8">Top Repositories</div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {enrichedRepos.sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 9).map(repo => (
                   <a 
                     key={repo.id} 
                     href={repo.html_url} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="block bg-[#F4F4F1] border-2 border-[#1A1A1A] p-6 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_#1A1A1A] transition-all group flex flex-col h-[220px] relative overflow-hidden"
                   >
                     <div className="absolute top-0 right-0 bg-[#1A1A1A] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest flex gap-2 items-center">
                       <span>Health</span>
                       <span className={repo.healthScore >= 80 ? "text-[#00FF00]" : repo.healthScore >= 50 ? "text-[#FFD700]" : "text-[#FF5C00]"}>{repo.healthScore}</span>
                     </div>
                     <div className="flex justify-between items-start mb-4 mt-4">
                       <h3 className="font-black text-xl uppercase tracking-tight break-words line-clamp-1">{repo.name}</h3>
                       {repo.language && (
                         <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-[#1A1A1A] text-white shrink-0 ml-4">
                           {repo.language}
                         </span>
                       )}
                     </div>
                     <p className="text-sm font-medium opacity-80 mb-6 flex-1 line-clamp-3">{repo.description || 'No description provided.'}</p>
                     <div className="flex items-center gap-6 mt-auto border-t-2 border-[#1A1A1A] border-opacity-10 pt-4 flex-wrap">
                       <div className="flex items-center gap-2">
                         <span className="w-3 h-3 bg-[#FF5C00]"></span>
                         <span className="font-bold text-xs uppercase tracking-widest">{repo.stargazers_count} Stars</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-3 h-3 border-2 border-[#1A1A1A]"></div>
                         <span className="font-bold text-xs uppercase tracking-widest">{repo.forks_count} Forks</span>
                       </div>
                     </div>
                   </a>
                 ))}
               </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

