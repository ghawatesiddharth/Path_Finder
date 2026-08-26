// Skill taxonomy + prerequisite graph — TS port of the Python skill_graph.py model.
// Each skill node has: label, domain, level (foundation/core/advanced), keywords
// (used for course tagging + goal matching), prereqs (list of skill ids).

export type StageLevel = 'foundation' | 'core' | 'advanced';

export interface SkillNode {
  id: string;
  label: string;
  domain: string;
  level: StageLevel;
  keywords: string[];
  prereqs: string[];
}

export const SKILLS: Record<string, Omit<SkillNode, 'id'>> = {
  // ---- Programming / CS foundations ----
  python_basics: { label: 'Python Basics', domain: 'programming', level: 'foundation',
    keywords: ['python', 'programming basics', 'intro to programming'], prereqs: [] },
  dsa: { label: 'Data Structures & Algorithms', domain: 'programming', level: 'core',
    keywords: ['data structure', 'algorithm', 'dsa'], prereqs: ['python_basics'] },
  sql_databases: { label: 'SQL & Databases', domain: 'programming', level: 'foundation',
    keywords: ['sql', 'database', 'mysql', 'postgres'], prereqs: [] },
  java_basics: { label: 'Java Programming', domain: 'programming', level: 'foundation',
    keywords: ['java'], prereqs: [] },
  cpp_basics: { label: 'C++ Programming', domain: 'programming', level: 'foundation',
    keywords: ['c++', 'cpp'], prereqs: [] },
  git_version_control: { label: 'Git & Version Control', domain: 'programming', level: 'foundation',
    keywords: ['git', 'github', 'version control'], prereqs: [] },
  android_dev: { label: 'Android Development', domain: 'programming', level: 'core',
    keywords: ['android development', 'android app'], prereqs: ['java_basics'] },

  // ---- Data Science / ML track ----
  stats_foundations: { label: 'Statistics Foundations', domain: 'data_science', level: 'foundation',
    keywords: ['statistics', 'probability', 'statistical'], prereqs: [] },
  data_analysis: { label: 'Data Analysis (Pandas/Excel)', domain: 'data_science', level: 'core',
    keywords: ['data analysis', 'pandas', 'excel', 'data analytics'], prereqs: ['python_basics'] },
  data_visualization: { label: 'Data Visualization', domain: 'data_science', level: 'core',
    keywords: ['data visualization', 'tableau', 'power bi', 'matplotlib'], prereqs: ['data_analysis'] },
  machine_learning: { label: 'Machine Learning', domain: 'data_science', level: 'core',
    keywords: ['machine learning', 'scikit', 'regression', 'classification'],
    prereqs: ['stats_foundations', 'data_analysis'] },
  deep_learning: { label: 'Deep Learning', domain: 'data_science', level: 'advanced',
    keywords: ['deep learning', 'neural network', 'tensorflow', 'pytorch', 'cnn'], prereqs: ['machine_learning'] },
  nlp: { label: 'Natural Language Processing', domain: 'data_science', level: 'advanced',
    keywords: ['nlp', 'natural language processing', 'text mining', 'llm'], prereqs: ['deep_learning'] },
  data_science_capstone: { label: 'Data Science Career/Capstone', domain: 'data_science', level: 'advanced',
    keywords: ['data scientist', 'data science specialization', 'capstone'], prereqs: ['machine_learning'] },

  // ---- Web Development track ----
  html_css: { label: 'HTML & CSS', domain: 'web_dev', level: 'foundation',
    keywords: ['html', 'css', 'web design'], prereqs: [] },
  javascript: { label: 'JavaScript', domain: 'web_dev', level: 'core',
    keywords: ['javascript', 'js '], prereqs: ['html_css'] },
  frontend_framework: { label: 'Frontend Framework (React/Angular/Vue)', domain: 'web_dev', level: 'core',
    keywords: ['react', 'angular', 'vue', 'frontend'], prereqs: ['javascript'] },
  backend_dev: { label: 'Backend Development (Node/Django/etc.)', domain: 'web_dev', level: 'core',
    keywords: ['node.js', 'django', 'backend', 'api development', 'flask', 'php'],
    prereqs: ['javascript', 'sql_databases'] },
  fullstack_capstone: { label: 'Full-Stack Project / Capstone', domain: 'web_dev', level: 'advanced',
    keywords: ['full stack', 'web developer bootcamp', 'mern', 'mean stack'],
    prereqs: ['frontend_framework', 'backend_dev'] },

  // ---- Cloud / DevOps ----
  cloud_fundamentals: { label: 'Cloud Fundamentals (AWS/GCP/Azure)', domain: 'cloud', level: 'foundation',
    keywords: ['aws', 'azure', 'google cloud', 'cloud computing'], prereqs: [] },
  devops: { label: 'DevOps & CI/CD', domain: 'cloud', level: 'core',
    keywords: ['devops', 'docker', 'kubernetes', 'ci/cd', 'jenkins'], prereqs: ['cloud_fundamentals'] },
  cybersecurity: { label: 'Cybersecurity Fundamentals', domain: 'cloud', level: 'core',
    keywords: ['cyber security', 'cybersecurity', 'network security', 'ethical hacking'], prereqs: [] },

  // ---- Business / Finance ----
  finance_basics: { label: 'Finance Fundamentals', domain: 'business', level: 'foundation',
    keywords: ['finance', 'financial', 'accounting', 'investment banking'], prereqs: [] },
  business_analytics: { label: 'Business Analytics', domain: 'business', level: 'core',
    keywords: ['business analytics', 'business analysis'], prereqs: ['finance_basics'] },
  digital_marketing: { label: 'Digital Marketing', domain: 'business', level: 'core',
    keywords: ['digital marketing', 'seo', 'social media marketing'], prereqs: [] },
  entrepreneurship: { label: 'Entrepreneurship', domain: 'business', level: 'advanced',
    keywords: ['entrepreneurship', 'startup'], prereqs: ['finance_basics'] },

  // ---- Design ----
  design_basics: { label: 'Graphic Design Basics', domain: 'design', level: 'foundation',
    keywords: ['graphic design', 'design fundamentals', 'illustrator', 'photoshop'], prereqs: [] },
  ui_ux: { label: 'UI/UX Design', domain: 'design', level: 'core',
    keywords: ['ui design', 'ux design', 'user experience', 'figma'], prereqs: ['design_basics'] },
};

/**
 * Sub-topic breakdown for skills that are too broad to learn from a single
 * video. Each entry is an ORDERED list of search-friendly sub-topic phrases;
 * the path generator fetches one resource PER sub-topic, so the learner gets
 * a full curriculum sequence rather than a single "crash course" link.
 *
 * Java is deliberately exhaustive (full undergrad-course-equivalent breadth,
 * basics through JDBC/multithreading) since a single 6-video pass isn't a
 * real learning path for a language this broad.
 */
export const SUBTOPICS: Record<string, string[]> = {
  java_basics: [
    'Java Introduction and JDK Setup',
    'Java Syntax Variables and Data Types',
    'Java Operators and Type Casting',
    'Java Control Flow (if/else, switch)',
    'Java Loops (for, while, do-while)',
    'Java Arrays (1D and 2D)',
    'Java Strings and String Methods',
    'Java Methods and Parameter Passing',
    'Java OOP Classes and Objects',
    'Java Constructors and this Keyword',
    'Java Inheritance',
    'Java Polymorphism (Overloading and Overriding)',
    'Java Abstraction (Abstract Classes and Interfaces)',
    'Java Encapsulation and Access Modifiers',
    'Java Exception Handling (try/catch/finally)',
    'Java Collections Framework (List, Set, Map)',
    'Java Generics',
    'Java Multithreading and Concurrency',
    'Java File Handling and I/O Streams',
    'Java JDBC (Database Connectivity)',
    'Java 8 Lambda Expressions and Streams API',
    'Java Design Patterns Overview',
    'Java Build Tools (Maven/Gradle) Basics',
    'Java Unit Testing with JUnit',
  ],
  dsa: [
    'Time and Space Complexity Big O',
    'Arrays and Strings',
    'Linked List',
    'Stacks and Queues',
    'Recursion and Backtracking',
    'Trees and Binary Search Trees',
    'Heaps and Priority Queues',
    'Hashing and Hash Maps',
    'Graphs BFS DFS',
    'Graph Algorithms (Dijkstra, Union-Find)',
    'Sorting Algorithms',
    'Searching Algorithms (Binary Search)',
    'Greedy Algorithms',
    'Dynamic Programming',
    'Sliding Window and Two Pointers',
  ],
  python_basics: [
    'Python Syntax and Variables',
    'Python Data Types',
    'Python Control Flow (if/loops)',
    'Python Functions and Scope',
    'Python Data Structures (lists, tuples, dicts, sets)',
    'Python String Manipulation',
    'Python OOP Classes',
    'Python Exception Handling',
    'Python File Handling',
    'Python Modules and Packages',
    'Python Comprehensions and Generators',
    'Python Virtual Environments and pip',
  ],
  javascript: [
    'JavaScript Variables and Data Types',
    'JavaScript Operators and Control Flow',
    'JavaScript Functions and Scope',
    'JavaScript Arrays and Objects',
    'JavaScript DOM Manipulation',
    'JavaScript Events',
    'JavaScript ES6 Features (let/const, arrow functions)',
    'JavaScript Destructuring and Spread Operator',
    'JavaScript Async/Await and Promises',
    'JavaScript Fetch API and AJAX',
    'JavaScript Error Handling',
    'JavaScript Modules (import/export)',
  ],
  machine_learning: [
    'Introduction to Machine Learning',
    'Supervised vs Unsupervised Learning',
    'Linear Regression',
    'Logistic Regression',
    'Decision Trees and Random Forest',
    'Support Vector Machines',
    'K-Nearest Neighbors',
    'K-Means Clustering',
    'Model Evaluation Metrics',
    'Cross-Validation and Hyperparameter Tuning',
    'Feature Engineering',
    'Ensemble Methods (Bagging/Boosting)',
  ],
  deep_learning: [
    'Neural Network Fundamentals',
    'Activation Functions',
    'Backpropagation Explained',
    'Convolutional Neural Networks (CNN)',
    'Recurrent Neural Networks (RNN/LSTM)',
    'Transfer Learning',
    'Regularization (Dropout, Batch Norm)',
    'Model Deployment Basics',
  ],
  nlp: [
    'Text Preprocessing and Tokenization',
    'Bag of Words and TF-IDF',
    'Word Embeddings (Word2Vec)',
    'Transformers Explained',
    'Attention Mechanism',
    'Fine-tuning Language Models',
  ],
  data_analysis: [
    'Pandas Basics',
    'Data Cleaning Techniques',
    'Exploratory Data Analysis (EDA)',
    'GroupBy and Aggregation in Pandas',
    'Merging and Joining DataFrames',
    'Handling Missing Data',
    'Excel for Data Analysis',
  ],
  data_visualization: [
    'Matplotlib Basics',
    'Seaborn for Statistical Plots',
    'Tableau Fundamentals',
    'Power BI Fundamentals',
  ],
  sql_databases: [
    'SQL SELECT and WHERE Basics',
    'SQL Joins Explained',
    'SQL Aggregate Functions and GROUP BY',
    'SQL Subqueries',
    'SQL Window Functions',
    'Database Normalization',
    'Indexes and Query Optimization',
  ],
  html_css: [
    'HTML Basics and Structure',
    'HTML Forms and Semantic Tags',
    'CSS Selectors and Box Model',
    'CSS Flexbox',
    'CSS Grid',
    'CSS Animations and Transitions',
    'Responsive Web Design',
  ],
  frontend_framework: [
    'React Fundamentals (Components, Props)',
    'React State and Hooks',
    'React Routing',
    'React Forms and Controlled Inputs',
    'State Management (Redux/Context)',
    'React Performance Optimization',
  ],
  backend_dev: [
    'REST API Fundamentals',
    'Node.js and Express Basics',
    'Middleware and Routing',
    'Authentication (JWT/OAuth)',
    'Connecting Backend to Database',
    'API Error Handling and Validation',
  ],
  cloud_fundamentals: [
    'Cloud Computing Basics (IaaS/PaaS/SaaS)',
    'AWS EC2 and S3 Basics',
    'Cloud Networking Fundamentals',
    'Cloud Storage and Databases',
    'Cloud Security Basics',
  ],
  devops: [
    'Docker Fundamentals',
    'Docker Compose',
    'Kubernetes Basics',
    'CI/CD Pipeline Concepts',
    'Jenkins Tutorial',
    'Infrastructure as Code Basics',
  ],
  cybersecurity: [
    'Cybersecurity Fundamentals',
    'Network Security Basics',
    'Ethical Hacking Introduction',
    'Common Web Vulnerabilities (OWASP)',
    'Cryptography Basics',
  ],
  stats_foundations: [
    'Descriptive Statistics',
    'Probability Basics',
    'Probability Distributions',
    'Hypothesis Testing',
    'Correlation and Regression Basics',
  ],
  finance_basics: [
    'Financial Accounting Basics',
    'Financial Statements Explained',
    'Time Value of Money',
    'Investment Banking Basics',
    'Ratio Analysis',
  ],
  digital_marketing: [
    'SEO Fundamentals',
    'Social Media Marketing Basics',
    'Google Ads Fundamentals',
    'Content Marketing Strategy',
    'Email Marketing Basics',
  ],
  design_basics: [
    'Design Principles and Color Theory',
    'Typography Basics',
    'Adobe Photoshop Basics',
    'Adobe Illustrator Basics',
  ],
  ui_ux: [
    'UX Design Process',
    'Wireframing and Prototyping',
    'Figma Tutorial',
    'Design Systems Basics',
    'Usability Testing Basics',
  ],
  cpp_basics: [
    'C++ Syntax and Variables',
    'C++ Control Flow',
    'C++ Functions and Pointers',
    'C++ OOP Concepts',
    'C++ STL (Standard Template Library)',
    'C++ Memory Management',
  ],
  git_version_control: [
    'Git Basics (init, add, commit)',
    'Git Branching and Merging',
    'GitHub Pull Requests',
    'Resolving Git Merge Conflicts',
  ],
  android_dev: [
    'Android Studio Setup',
    'Android UI Layouts (XML)',
    'Android Activities and Intents',
    'Android RecyclerView',
    'Android App with Firebase/Room DB',
  ],
  data_science_capstone: [
    'Framing a Data Science Problem Statement',
    'End-to-End EDA on a Real Dataset',
    'Feature Engineering for a Capstone Project',
    'Model Selection and Comparison',
    'Building a Results Dashboard (Streamlit/Power BI)',
    'Writing Up and Presenting Data Science Findings',
    'Deploying a Model as an API',
    'Portfolio-Ready Case Study Documentation',
  ],
  fullstack_capstone: [
    'Planning a Full-Stack App Architecture',
    'Designing the Database Schema',
    'Building the REST API Layer',
    'Connecting Frontend to Backend',
    'Authentication and Authorization End-to-End',
    'Deployment (Frontend + Backend + DB)',
    'Writing Tests for a Full-Stack App',
    'Polishing UI/UX for a Portfolio Project',
  ],
  business_analytics: [
    'Business Analytics Fundamentals',
    'KPI and Metric Design',
    'Data-Driven Decision Making',
    'Dashboarding for Business Stakeholders (Power BI/Tableau)',
    'A/B Testing Basics',
    'Business Case Study Analysis',
  ],
  entrepreneurship: [
    'Ideation and Problem Validation',
    'Business Model Canvas',
    'Market Research Basics',
    'MVP Planning and Lean Startup',
    'Pitching and Fundraising Basics',
    'Unit Economics Fundamentals',
  ],
};

export function getSubtopics(skillId: string, label: string): string[] {
  return SUBTOPICS[skillId] ?? [label];
}

export function buildSkillList(): SkillNode[] {
  return Object.entries(SKILLS).map(([id, meta]) => ({ id, ...meta }));
}

/** Ancestors of goalId (all transitive prerequisites), minus anything already known,
 *  topologically sorted so every dependency comes before what depends on it. */
export function shortestLearningOrder(startKnown: string[], goalId: string): string[] {
  if (!SKILLS[goalId]) return [];
  const known = new Set(startKnown);

  const ancestors = new Set<string>();
  const collect = (id: string) => {
    const prereqs = SKILLS[id]?.prereqs ?? [];
    for (const p of prereqs) {
      if (!ancestors.has(p)) {
        ancestors.add(p);
        collect(p);
      }
    }
  };
  collect(goalId);
  ancestors.add(goalId);

  const needed = [...ancestors].filter((id) => !known.has(id));
  const neededSet = new Set(needed);

  // topological sort (Kahn's algorithm) restricted to `needed`
  const inDegree: Record<string, number> = {};
  const adj: Record<string, string[]> = {};
  for (const id of needed) {
    inDegree[id] = 0;
    adj[id] = [];
  }
  for (const id of needed) {
    for (const p of SKILLS[id].prereqs) {
      if (neededSet.has(p)) {
        adj[p].push(id);
        inDegree[id] += 1;
      }
    }
  }
  const queue = needed.filter((id) => inDegree[id] === 0);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const next of adj[id]) {
      inDegree[next] -= 1;
      if (inDegree[next] === 0) queue.push(next);
    }
  }
  return order.length === needed.length ? order : needed;
}
