'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, UserPlus, Calendar, RefreshCw, Download, Edit, Save, X, Lock, Unlock, Settings, Users, Check, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

// Define pharmacy rotation data
const PHARMACIES = [
  { name: 'ART', days: 2, description: 'Antiretroviral Therapy' },
  { name: 'MCH', days: 1, description: 'Maternal and Child Health' },
  { name: 'Emergency', days: 1, description: 'Emergency Services' },
  { name: 'Chronic', days: 2, description: 'Chronic Disease Management' },
  { name: 'OPD', days: 2, description: 'Outpatient Department' },
  { name: 'Inpatient', days: 1, description: 'Inpatient Services' },
  { name: 'Compounding', days: 1, description: 'Medication Compounding' },
];

// Define types for our data
type User = {
  id: string;
  name: string;
  isAdmin?: boolean;
  selected?: boolean;
  groupId?: string;
};

type Group = {
  id: string;
  name: string;
  color: string;
  users: User[];
};

type ScheduleItem = {
  id: string;
  pharmacy: string;
  user: string;
  groupId: string;
  day: string;
  description: string;
  isEditing?: boolean;
};

// Add new type for tracking group progress
type GroupProgress = {
  groupId: string;
  currentPharmacyIndex: number;
  startedRotation: boolean;
  completedPharmacies: string[];
};

// Add new type for tracking current assignments
type CurrentAssignments = {
  date: string;
  assignments: {
    [pharmacyName: string]: string; // pharmacyName -> groupId
  };
};

// Add new types for automatic rotation
type PharmacyAssignment = {
  groupId: string;
  pharmacyName: string;
  date: string;
  dayNumber: number;
};

// Local storage keys
const USERS_STORAGE_KEY = 'pharmacy-rotation-users';
const GROUPS_STORAGE_KEY = 'pharmacy-rotation-groups';
const SCHEDULE_STORAGE_KEY = 'pharmacy-rotation-schedule';
const START_DATE_STORAGE_KEY = 'pharmacy-rotation-start-date';

// Colors for groups
const GROUP_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
  '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
];

// Helper function to check if localStorage is available
const isLocalStorageAvailable = () => {
  try {
    const testKey = '__test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export function PharmacyRotation() {
  // State management
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [newUser, setNewUser] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [selectedUsersForExport, setSelectedUsersForExport] = useState<string[]>([]);
  const [selectAllUsers, setSelectAllUsers] = useState(false);
  const [isStorageAvailable, setIsStorageAvailable] = useState(false);
  const scheduleRef = useRef<HTMLDivElement>(null);
  const filteredScheduleRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);
  const [groupProgress, setGroupProgress] = useState<GroupProgress[]>([]);
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [selectedGroupForProgress, setSelectedGroupForProgress] = useState<string | null>(null);
  const [currentAssignments, setCurrentAssignments] = useState<PharmacyAssignment[]>([]);

  // Check if localStorage is available on component mount
  useEffect(() => {
    const storageAvailable = isLocalStorageAvailable();
    setIsStorageAvailable(storageAvailable);
    
    if (!storageAvailable) {
      toast.error('Local storage is not available. Your data will not be saved between sessions.');
    }
  }, []);

  // Load data from local storage on component mount
  useEffect(() => {
    if (!isStorageAvailable || initialLoadRef.current) return;
    
    try {
      // Load users
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (savedUsers) {
        const parsedUsers = JSON.parse(savedUsers);
        if (Array.isArray(parsedUsers)) {
          setUsers(parsedUsers);
        }
      }

      // Load groups
      const savedGroups = localStorage.getItem(GROUPS_STORAGE_KEY);
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        if (Array.isArray(parsedGroups)) {
          setGroups(parsedGroups);
        }
      }

      // Load schedule
      const savedSchedule = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (savedSchedule) {
        const parsedSchedule = JSON.parse(savedSchedule);
        if (Array.isArray(parsedSchedule)) {
          setSchedule(parsedSchedule);
        }
      }

      // Load start date
      const savedStartDate = localStorage.getItem(START_DATE_STORAGE_KEY);
      if (savedStartDate) {
        setStartDate(savedStartDate);
      }
      
      initialLoadRef.current = true;
    } catch (error) {
      console.error('Error loading data from local storage:', error);
      toast.error('Failed to load saved data');
    }
  }, [isStorageAvailable]);

  // Save users to local storage whenever they change
  useEffect(() => {
    if (!isStorageAvailable || !initialLoadRef.current) return;
    
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Error saving users to local storage:', error);
      toast.error('Failed to save user data');
    }
  }, [users, isStorageAvailable]);

  // Save groups to local storage whenever they change
  useEffect(() => {
    if (!isStorageAvailable || !initialLoadRef.current) return;
    
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
    } catch (error) {
      console.error('Error saving groups to local storage:', error);
      toast.error('Failed to save group data');
    }
  }, [groups, isStorageAvailable]);

  // Save schedule to local storage whenever it changes
  useEffect(() => {
    if (!isStorageAvailable || !initialLoadRef.current) return;
    
    try {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(schedule));
    } catch (error) {
      console.error('Error saving schedule to local storage:', error);
      toast.error('Failed to save schedule data');
    }
  }, [schedule, isStorageAvailable]);

  // Save start date to local storage whenever it changes
  useEffect(() => {
    if (!isStorageAvailable || !initialLoadRef.current) return;
    
    try {
      localStorage.setItem(START_DATE_STORAGE_KEY, startDate);
    } catch (error) {
      console.error('Error saving start date to local storage:', error);
      toast.error('Failed to save start date');
    }
  }, [startDate, isStorageAvailable]);

  // Clear all saved data
  const clearAllData = () => {
    if (!isStorageAvailable) {
      setUsers([]);
      setGroups([]);
      setSchedule([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      toast.success('All data cleared successfully');
      return;
    }
    
    try {
      localStorage.removeItem(USERS_STORAGE_KEY);
      localStorage.removeItem(GROUPS_STORAGE_KEY);
      localStorage.removeItem(SCHEDULE_STORAGE_KEY);
      localStorage.removeItem(START_DATE_STORAGE_KEY);
      setUsers([]);
      setGroups([]);
      setSchedule([]);
      setStartDate(new Date().toISOString().split('T')[0]);
      toast.success('All data cleared successfully');
    } catch (error) {
      console.error('Error clearing data from local storage:', error);
      toast.error('Failed to clear data');
    }
  };

  // Add a new user
  const addUser = () => {
    if (newUser.trim() && !users.some(user => user.name === newUser.trim())) {
      const updatedUsers = [...users, { 
        id: Date.now().toString(), 
        name: newUser.trim(),
        isAdmin: users.length === 0, // First user is admin by default
        selected: false
      }];
      setUsers(updatedUsers);
      setNewUser('');
      toast.success(`Added ${newUser.trim()} to the rotation`);
    } else if (users.some(user => user.name === newUser.trim())) {
      toast.error('User already exists');
    }
  };

  // Remove a user
  const removeUser = (userId: string) => {
    const userToRemove = users.find(user => user.id === userId);
    setUsers(users.filter(user => user.id !== userId));
    if (userToRemove) {
      toast.success(`Removed ${userToRemove.name} from the rotation`);
    }
  };

  // Toggle admin status for a user
  const toggleAdmin = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, isAdmin: !user.isAdmin } : user
    ));
  };

  // Update the generateSchedule function to work with groups
  const generateSchedule = () => {
    if (groups.length === 0) {
      toast.error('Please create groups before generating a schedule');
      return;
    }

    const days = Array.from({ length: 10 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    const newSchedule: ScheduleItem[] = [];
    let currentDay = 0;

    // For each group, create a 10-day rotation
    groups.forEach((group, groupIndex) => {
      currentDay = 0; // Reset day counter for each group
      
      // Assign days for each pharmacy according to their required duration
      PHARMACIES.forEach(pharmacy => {
        // Create assignments for the number of days required for this pharmacy
        for (let i = 0; i < pharmacy.days; i++) {
          if (currentDay < 10) { // Ensure we don't exceed 10 days
            const dayOffset = groupIndex * 10; // Offset days based on group number
            const date = new Date(startDate);
            date.setDate(date.getDate() + currentDay + dayOffset);
            
            newSchedule.push({
              id: crypto.randomUUID(),
              pharmacy: pharmacy.name,
              user: group.name,
              groupId: group.id,
              day: date.toISOString().split('T')[0],
              description: `${group.name} at ${pharmacy.name} - ${pharmacy.description} (Day ${currentDay + 1})`
            });
            
            currentDay++;
          }
        }
      });
    });

    setSchedule(newSchedule);
    toast.success('Schedule generated successfully');
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addUser();
    }
  };

  // Toggle edit mode for a schedule item
  const toggleEditMode = (id: string) => {
    setSchedule(schedule.map(item => 
      item.id === id ? { ...item, isEditing: !item.isEditing } : item
    ));
  };

  // Update user assignment for a schedule item
  const updateAssignment = (id: string, newUser: string) => {
    setSchedule(schedule.map(item => 
      item.id === id ? { ...item, user: newUser, isEditing: false } : item
    ));
    toast.success('Assignment updated');
  };

  // Toggle user selection for export
  const toggleUserSelection = (userId: string) => {
    const updatedUsers = users.map(user => 
      user.id === userId ? { ...user, selected: !user.selected } : user
    );
    setUsers(updatedUsers);
    
    // Update selectedUsersForExport array
    const selectedUsers = updatedUsers
      .filter(user => user.selected)
      .map(user => user.name);
    setSelectedUsersForExport(selectedUsers);
    
    // Update selectAll state
    setSelectAllUsers(selectedUsers.length === users.length);
  };

  // Toggle select all users for export
  const toggleSelectAllUsers = () => {
    const newSelectAll = !selectAllUsers;
    setSelectAllUsers(newSelectAll);
    
    const updatedUsers = users.map(user => ({
      ...user,
      selected: newSelectAll
    }));
    setUsers(updatedUsers);
    
    if (newSelectAll) {
      setSelectedUsersForExport(updatedUsers.map(user => user.name));
    } else {
      setSelectedUsersForExport([]);
    }
  };

  // Open export dialog
  const openExportDialog = () => {
    // Initialize all users as unselected
    setUsers(users.map(user => ({ ...user, selected: false })));
    setSelectedUsersForExport([]);
    setSelectAllUsers(false);
    setExportDialogOpen(true);
  };

  // Export schedule as image
  const exportAsImage = async () => {
    if (scheduleRef.current && selectedUsersForExport.length > 0) {
      try {
        // Create a filtered schedule for selected users
        const filteredSchedule = schedule.filter(item => 
          selectedUsersForExport.includes(item.user)
        );
        
        // Create a temporary div with only the filtered schedule
        const tempDiv = document.createElement('div');
        tempDiv.className = 'bg-white p-4 rounded-md';
        tempDiv.innerHTML = `
          <h2 class="text-xl font-bold mb-4">Pharmacy Rotation Schedule</h2>
          <p class="text-sm mb-4">Generated on ${new Date().toLocaleDateString()}</p>
          <table class="w-full border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-left p-2">Day</th>
                <th class="text-left p-2">Pharmacist</th>
                <th class="text-left p-2">Unit</th>
                <th class="text-left p-2">Description</th>
              </tr>
            </thead>
            <tbody>
              ${filteredSchedule.map(item => `
                <tr class="border-b">
                  <td class="p-2">${item.day}</td>
                  <td class="p-2">${item.user}</td>
                  <td class="p-2">${item.pharmacy}</td>
                  <td class="p-2">${item.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
        
        document.body.appendChild(tempDiv);
        
        // Generate image from the temporary div
        const canvas = await html2canvas(tempDiv);
        const image = canvas.toDataURL('image/png');
        
        // Remove the temporary div
        document.body.removeChild(tempDiv);
        
        // Download the image
        const link = document.createElement('a');
        link.href = image;
        link.download = `pharmacy-rotation-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
        
        // Close the dialog
        setExportDialogOpen(false);
        toast.success('Schedule exported successfully');
      } catch (error) {
        console.error('Error exporting image:', error);
        toast.error('Failed to export schedule');
      }
    }
  };

  // Group management functions
  const addGroup = () => {
    if (!newGroup.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    const groupExists = groups.some(g => g.name.toLowerCase() === newGroup.toLowerCase());
    if (groupExists) {
      toast.error('Group already exists');
      return;
    }

    const newGroupObj: Group = {
      id: crypto.randomUUID(),
      name: newGroup.trim(),
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      users: []
    };

    setGroups([...groups, newGroupObj]);
    setNewGroup('');
    toast.success('Group added successfully');
  };

  const removeGroup = (groupId: string) => {
    setGroups(groups.filter(g => g.id !== groupId));
    setUsers(users.map(u => u.groupId === groupId ? { ...u, groupId: undefined } : u));
    toast.success('Group removed successfully');
  };

  const addUserToGroup = (userId: string, groupId: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, groupId } : u
    ));
    toast.success('User added to group');
  };

  const removeUserFromGroup = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId ? { ...u, groupId: undefined } : u
    ));
    toast.success('User removed from group');
  };

  // Calculate the current day's assignments for all groups
  const calculateCurrentAssignments = () => {
    const assignments: PharmacyAssignment[] = [];
    const today = new Date();
    const startDateObj = new Date(startDate);
    
    // Calculate days since start
    const daysSinceStart = Math.floor((today.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    
    groups.forEach((group, groupIndex) => {
      // Calculate which pharmacy this group should be at
      // Each group starts at a different pharmacy to avoid conflicts
      const totalDays = PHARMACIES.reduce((sum, p) => sum + p.days, 0); // Total days in rotation
      const currentCycle = Math.floor(daysSinceStart / totalDays);
      let daysInCurrentCycle = daysSinceStart % totalDays;
      
      // Offset each group's starting position
      daysInCurrentCycle = (daysInCurrentCycle + (groupIndex * (totalDays / groups.length))) % totalDays;
      
      // Find current pharmacy based on days count
      let currentDayCount = 0;
      let currentPharmacyIndex = 0;
      
      for (let i = 0; i < PHARMACIES.length; i++) {
        if (currentDayCount + PHARMACIES[i].days > daysInCurrentCycle) {
          currentPharmacyIndex = i;
          break;
        }
        currentDayCount += PHARMACIES[i].days;
      }
      
      // Calculate which day they are in at current pharmacy
      const dayInCurrentPharmacy = daysInCurrentCycle - currentDayCount + 1;
      
      assignments.push({
        groupId: group.id,
        pharmacyName: PHARMACIES[currentPharmacyIndex].name,
        date: today.toISOString().split('T')[0],
        dayNumber: dayInCurrentPharmacy
      });
    });
    
    return assignments;
  };

  // Add function to get next pharmacy for a group
  const getNextPharmacy = (groupId: string) => {
    const currentAssignment = currentAssignments.find(a => a.groupId === groupId);
    if (!currentAssignment) return PHARMACIES[0];
    
    const currentIndex = PHARMACIES.findIndex(p => p.name === currentAssignment.pharmacyName);
    const nextIndex = (currentIndex + 1) % PHARMACIES.length;
    return PHARMACIES[nextIndex];
  };

  // Update assignments when date or groups change
  useEffect(() => {
    setCurrentAssignments(calculateCurrentAssignments());
  }, [startDate, groups]);

  // Rotation Bubble Visualization Component
  const RotationBubble = ({ schedule, groups, users }: { 
    schedule: ScheduleItem[], 
    groups: Group[], 
    users: User[] 
  }) => {
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Clear previous content
      while (canvas.firstChild) {
        canvas.removeChild(canvas.firstChild);
      }

      // Create container for each group's rotation
      const container = document.createElement('div');
      container.className = 'flex flex-wrap gap-8 justify-center';
      canvas.appendChild(container);

      // For each group, create a rotation diagram
      groups.forEach(group => {
        const groupContainer = document.createElement('div');
        groupContainer.className = 'relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-xl p-8';
        groupContainer.style.width = '700px';
        groupContainer.style.height = '700px';

        // Add group title
        const title = document.createElement('div');
        title.className = 'flex items-center justify-center gap-3 mb-6';
        title.innerHTML = `
          <h2 class="text-3xl font-bold text-white">${group.name}</h2>
          <span class="px-3 py-1 rounded-full text-sm font-medium" style="background-color: ${group.color}">
            ${users.filter(u => u.groupId === group.id).length} Members
          </span>
        `;
        groupContainer.appendChild(title);

        // Create SVG for the rotation diagram
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '640');
        svg.setAttribute('height', '640');
        svg.style.display = 'block';
        svg.style.margin = '0 auto';

        const centerX = 320;
        const centerY = 320;
        const radius = 260;

        // Add center circle with group name
        const centerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        centerCircle.setAttribute('cx', centerX.toString());
        centerCircle.setAttribute('cy', centerY.toString());
        centerCircle.setAttribute('r', '80');
        centerCircle.setAttribute('fill', group.color);
        centerCircle.setAttribute('opacity', '0.2');
        svg.appendChild(centerCircle);

        const centerText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        centerText.setAttribute('x', centerX.toString());
        centerText.setAttribute('y', centerY.toString());
        centerText.setAttribute('text-anchor', 'middle');
        centerText.setAttribute('dominant-baseline', 'middle');
        centerText.setAttribute('fill', 'white');
        centerText.setAttribute('font-size', '24');
        centerText.setAttribute('font-weight', 'bold');
        centerText.textContent = 'Rotation';
        svg.appendChild(centerText);

        // Create pharmacy bubbles
        PHARMACIES.forEach((pharmacy, index) => {
          const angle = (2 * Math.PI * index) / PHARMACIES.length - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          // Get schedule items for this pharmacy and group
          const pharmacySchedule = schedule.filter(item => 
            item.groupId === group.id && 
            item.pharmacy === pharmacy.name
          );

          // Create pharmacy bubble
          const bubble = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          
          // Get current assignment status
          const currentAssignment = currentAssignments.find(a => a.groupId === group.id);
          const isCurrentPharmacy = currentAssignment?.pharmacyName === pharmacy.name;
          
          // Create circle
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x.toString());
          circle.setAttribute('cy', y.toString());
          circle.setAttribute('r', '75');
          
          // Update circle styling based on status
          if (isCurrentPharmacy) {
            circle.setAttribute('fill', group.color);
          } else {
            circle.setAttribute('fill', 'rgba(255, 255, 255, 0.05)');
            circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
            circle.setAttribute('stroke-width', '2');
          }

          // Create pharmacy name text
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', x.toString());
          text.setAttribute('y', (y - 20).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('font-size', '20');
          text.setAttribute('font-weight', 'bold');
          text.setAttribute('fill', isCurrentPharmacy ? 'white' : 'rgba(255, 255, 255, 0.9)');
          text.textContent = pharmacy.name;

          // Create days text
          const daysText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          daysText.setAttribute('x', x.toString());
          daysText.setAttribute('y', (y - 2).toString()); // Move up slightly to avoid arrow
          daysText.setAttribute('text-anchor', 'middle');
          daysText.setAttribute('font-size', '16');
          daysText.setAttribute('fill', isCurrentPharmacy ? 'white' : 'rgba(255, 255, 255, 0.7)');
          daysText.textContent = `${pharmacy.days} day${pharmacy.days > 1 ? 's' : ''}`;

          // Create status text
          const statusText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          statusText.setAttribute('x', x.toString());
          statusText.setAttribute('y', (y + 25).toString());
          statusText.setAttribute('text-anchor', 'middle');
          statusText.setAttribute('font-size', '16');
          statusText.setAttribute('fill', isCurrentPharmacy ? 'white' : 'rgba(255, 255, 255, 0.5)');
          statusText.textContent = isCurrentPharmacy ? 'Current' : 'Pending';

          // If not the last pharmacy, create arrow to next pharmacy
          if (index < PHARMACIES.length - 1) {
            const nextAngle = (2 * Math.PI * (index + 1)) / PHARMACIES.length - Math.PI / 2;
            const nextX = centerX + radius * Math.cos(nextAngle);
            const nextY = centerY + radius * Math.sin(nextAngle);

            // Create curved arrow with arrow marker
            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midAngle = (angle + nextAngle) / 2;
            const controlX = centerX + radius * 1.2 * Math.cos(midAngle);
            const controlY = centerY + radius * 1.2 * Math.sin(midAngle);
            
            const dx = nextX - x;
            const dy = nextY - y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / length;
            const ndy = dy / length;
            const bubbleRadius = 75; // Adjust based on your actual bubble size
            const shortenedEndX = nextX - ndx * bubbleRadius;
            const shortenedEndY = nextY - ndy * bubbleRadius;
            
            const path = `M ${x} ${y} Q ${controlX} ${controlY} ${shortenedEndX} ${shortenedEndY}`;
            arrow.setAttribute('d', path);
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('stroke', isCurrentPharmacy ? group.color : 'rgba(255, 255, 255, 0.3)');
            arrow.setAttribute('stroke-width', '3');
            arrow.setAttribute('marker-end', `url(#arrowhead-${isCurrentPharmacy ? 'current' : 'default'}-${group.id})`);
            svg.appendChild(arrow);
          } else {
            // Create arrow from last to first pharmacy
            const firstAngle = -Math.PI / 2;
            const firstX = centerX + radius * Math.cos(firstAngle);
            const firstY = centerY + radius * Math.sin(firstAngle);

            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midAngle = (angle + firstAngle + 2 * Math.PI) / 2;
            const controlX = centerX + radius * 1.2 * Math.cos(midAngle);
            const controlY = centerY + radius * 1.2 * Math.sin(midAngle);
            
            const dx = firstX - x;
            const dy = firstY - y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / length;
            const ndy = dy / length;
            const bubbleRadius = 75; // Adjust based on your actual bubble size
            const shortenedEndX = firstX - ndx * bubbleRadius;
            const shortenedEndY = firstY - ndy * bubbleRadius;
            
            const path = `M ${x} ${y} Q ${controlX} ${controlY} ${shortenedEndX} ${shortenedEndY}`;
            arrow.setAttribute('d', path);
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('stroke', isCurrentPharmacy ? group.color : 'rgba(255, 255, 255, 0.3)');
            arrow.setAttribute('stroke-width', '3');
            arrow.setAttribute('marker-end', `url(#arrowhead-${isCurrentPharmacy ? 'current' : 'default'}-${group.id})`);
            svg.appendChild(arrow);
          }

          bubble.appendChild(circle);
          bubble.appendChild(text);
          bubble.appendChild(daysText);
          bubble.appendChild(statusText);
          svg.appendChild(bubble);
        });

        // Add arrow marker definitions for this group
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Default arrow marker
        const defaultMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        defaultMarker.setAttribute('id', `arrowhead-default-${group.id}`);
        defaultMarker.setAttribute('markerWidth', '12');
        defaultMarker.setAttribute('markerHeight', '8');
        defaultMarker.setAttribute('refX', '10');
        defaultMarker.setAttribute('refY', '4');
        defaultMarker.setAttribute('orient', 'auto');
        
        const defaultPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        defaultPolygon.setAttribute('points', '0 0, 12 4, 0 8');
        defaultPolygon.setAttribute('fill', 'rgba(255, 255, 255, 0.3)');
        
        defaultMarker.appendChild(defaultPolygon);
        defs.appendChild(defaultMarker);

        // Current arrow marker
        const currentMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        currentMarker.setAttribute('id', `arrowhead-current-${group.id}`);
        currentMarker.setAttribute('markerWidth', '10'); // Reduced from 12
        currentMarker.setAttribute('markerHeight', '6'); // Reduced from 8
        currentMarker.setAttribute('refX', '8'); // Adjusted from 10
        currentMarker.setAttribute('refY', '3'); // Adjusted from 4
        currentMarker.setAttribute('orient', 'auto');
        
        const currentPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        currentPolygon.setAttribute('points', '0 0, 12 4, 0 8');
        currentPolygon.setAttribute('fill', group.color);
        // Add opacity
        currentPolygon.setAttribute('opacity', '0.7');
        
        currentMarker.appendChild(currentPolygon);
        defs.appendChild(currentMarker);

        svg.appendChild(defs);

        // Add legend
        const legend = document.createElement('div');
        legend.className = 'absolute bottom-4 left-4 bg-gray-800/50 backdrop-blur-sm rounded-lg p-4';
        legend.innerHTML = `
          <div class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full" style="background-color: ${group.color}"></div>
              <span class="text-white text-sm">Current Location</span>
            </div>
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 rounded-full bg-gray-500"></div>
              <span class="text-white text-sm">Other Locations</span>
            </div>
          </div>
        `;
        groupContainer.appendChild(legend);

        // Add download buttons
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'absolute bottom-4 right-4 flex gap-2';

        const downloadCycleButton = document.createElement('button');
        downloadCycleButton.className = 'bg-gray-800/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700/50 transition-colors flex items-center gap-2';
        downloadCycleButton.innerHTML = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>Download Cycle';
        downloadCycleButton.addEventListener('click', (e) => {
          e.preventDefault();
          generateCycleImage(group);
        });

        const downloadScheduleButton = document.createElement('button');
        downloadScheduleButton.className = 'bg-gray-800/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700/50 transition-colors flex items-center gap-2';
        downloadScheduleButton.innerHTML = '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14V6.5c0-1.1-.9-2-2-2h-4V2.5L9 4l4 1.5V4.5h4L17 14M6 7h4m-4 4h4m-4 4h12"></path></svg>Download Schedule';
        downloadScheduleButton.addEventListener('click', (e) => {
          e.preventDefault();
          generateGroupPharmacyImages(group);
        });

        buttonsContainer.appendChild(downloadCycleButton);
        buttonsContainer.appendChild(downloadScheduleButton);
        groupContainer.appendChild(buttonsContainer);

        groupContainer.appendChild(svg);
        container.appendChild(groupContainer);
      });

    }, [schedule, groups, users, currentAssignments]);

    return (
      <div ref={canvasRef} className="rotation-visualization" />
    );
  };

  // Update the ScheduleDisplay component to show group-focused view
  const ScheduleDisplay = ({ schedule, groups }: { schedule: ScheduleItem[], groups: Group[] }) => {
    return (
      <div className="space-y-6">
        {PHARMACIES.map(pharmacy => {
          const pharmacySchedule = schedule.filter(item => item.pharmacy === pharmacy.name);
          
          return (
            <Card key={pharmacy.name}>
              <CardHeader>
                <CardTitle>{pharmacy.name}</CardTitle>
                <CardDescription>{pharmacy.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pharmacySchedule.map((item) => {
                    const group = groups.find(g => g.id === item.groupId);
                    return (
                      <div 
                        key={item.id} 
                        className="p-4 rounded-lg border"
                        style={{ borderColor: group?.color || '#e5e7eb' }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-gray-600">{item.day}</p>
                          </div>
                          {group && (
                            <span 
                              className="px-3 py-1 rounded-full text-sm font-medium"
                              style={{ 
                                backgroundColor: group.color,
                                color: 'white'
                              }}
                            >
                              {group.name}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {users.filter(u => u.groupId === item.groupId).map(user => (
                            <div key={user.id} className="inline-block mr-2">
                              {user.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Add this function before the return statement
  const generateGroupPharmacyImages = async (targetGroup?: Group) => {
    if (!groups.length) {
      toast.error('No groups available to generate images');
      return;
    }

    try {
      // If targetGroup is provided, only generate for that group, otherwise generate for all groups
      const groupsToProcess = targetGroup ? [targetGroup] : groups;

      // For each group, create an image for their schedule
      for (const group of groupsToProcess) {
        // Filter schedule items for this group
        const groupSchedule = schedule.filter(item => item.groupId === group.id);
        
        if (groupSchedule.length === 0) {
          continue; // Skip if no schedule items for this group
        }

        // Create a temporary div for this group's schedule
        const tempDiv = document.createElement('div');
        tempDiv.className = 'bg-white p-6 rounded-lg shadow-lg';
        tempDiv.style.width = '800px'; // Fixed width for consistent image size
        
        // Group header with styling
        tempDiv.innerHTML = `
          <div style="border-bottom: 2px solid ${group.color}; margin-bottom: 1rem; padding-bottom: 1rem;">
            <h2 style="color: ${group.color}; font-size: 24px; font-weight: bold; margin-bottom: 0.5rem;">
              ${group.name} - Pharmacy Rotation Schedule
            </h2>
            <p style="color: #666; font-size: 14px;">Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;">
            ${PHARMACIES.map(pharmacy => {
              const pharmacySchedule = groupSchedule.filter(item => 
                item.pharmacy === pharmacy.name
              );
              
              return `
                <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background-color: #f8fafc;">
                  <h3 style="color: ${group.color}; font-size: 18px; font-weight: bold; margin-bottom: 0.5rem;">
                    ${pharmacy.name}
                  </h3>
                  <p style="color: #666; font-size: 12px; margin-bottom: 0.5rem;">
                    ${pharmacy.description}
                  </p>
                  <div style="border-top: 1px solid #e5e7eb; margin-top: 0.5rem; padding-top: 0.5rem;">
                    ${pharmacySchedule.map(item => `
                      <div style="margin-bottom: 0.5rem; font-size: 14px;">
                        <div style="color: #374151;">${item.user}</div>
                        <div style="color: #6b7280; font-size: 12px;">${item.day}</div>
                      </div>
                    `).join('') || '<p style="color: #6b7280; font-style: italic;">No assignments</p>'}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Add to document temporarily
        document.body.appendChild(tempDiv);

        // Generate image
        const canvas = await html2canvas(tempDiv, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
        });

        // Convert to image and download
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `${group.name.toLowerCase().replace(/\s+/g, '-')}-rotation-${new Date().toISOString().split('T')[0]}.png`;
        link.click();

        // Clean up
        document.body.removeChild(tempDiv);
      }

      toast.success(targetGroup ? 'Generated image for group' : 'Generated images for all groups');
    } catch (error) {
      console.error('Error generating group images:', error);
      toast.error('Failed to generate group images');
    }
  };

  // Add this function before the return statement
  const generateCycleImage = async (targetGroup?: Group) => {
    if (!groups.length) {
      toast.error('No groups available to generate cycle visualization');
      return;
    }

    try {
      // If targetGroup is provided, only generate for that group, otherwise generate for all groups
      const groupsToProcess = targetGroup ? [targetGroup] : groups;

      for (const group of groupsToProcess) {
        // Create a temporary div for the cycle visualization
        const tempDiv = document.createElement('div');
        tempDiv.className = 'bg-white p-6 rounded-lg shadow-lg';
        tempDiv.style.width = '400px';
        tempDiv.style.height = '400px';

        // Create SVG for the rotation diagram
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '360');
        svg.setAttribute('height', '360');
        svg.style.display = 'block';
        svg.style.margin = '0 auto';

        const centerX = 180;
        const centerY = 180;
        const radius = 140;

        // Add title
        const title = document.createElement('div');
        title.textContent = `${group.name} - Rotation Cycle`;
        title.style.color = group.color;
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';
        tempDiv.appendChild(title);

        // Create pharmacy bubbles
        PHARMACIES.forEach((pharmacy, index) => {
          const angle = (2 * Math.PI * index) / PHARMACIES.length - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);

          // Get schedule items for this pharmacy and group
          const pharmacySchedule = schedule.filter(item => 
            item.groupId === group.id && 
            item.pharmacy === pharmacy.name
          );

          // Create pharmacy bubble
          const bubble = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          
          // Get current assignment status
          const currentAssignment = currentAssignments.find(a => a.groupId === group.id);
          const isCurrentPharmacy = currentAssignment?.pharmacyName === pharmacy.name;
          
          // Create circle
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x.toString());
          circle.setAttribute('cy', y.toString());
          circle.setAttribute('r', '45');
          
          // Update circle styling based on status
          if (isCurrentPharmacy) {
            circle.setAttribute('fill', group.color);
          } else {
            circle.setAttribute('fill', 'white');
            circle.setAttribute('stroke', 'rgba(255, 255, 255, 0.2)');
            circle.setAttribute('stroke-width', '2');
          }

          // Create pharmacy name text
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', x.toString());
          text.setAttribute('y', (y - 15).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('dominant-baseline', 'middle');
          text.setAttribute('font-size', '14');
          text.setAttribute('font-weight', 'bold');
          text.textContent = pharmacy.name;

          // Create days text
          const daysText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          daysText.setAttribute('x', x.toString());
          daysText.setAttribute('y', y.toString());
          daysText.setAttribute('text-anchor', 'middle');
          daysText.setAttribute('font-size', '12');
          daysText.setAttribute('fill', '#666');
          daysText.textContent = `${pharmacy.days} day${pharmacy.days > 1 ? 's' : ''}`;

          // Create date text
          const dateText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          dateText.setAttribute('x', x.toString());
          dateText.setAttribute('y', (y + 15).toString());
          dateText.setAttribute('text-anchor', 'middle');
          dateText.setAttribute('font-size', '11');
          dateText.setAttribute('fill', '#444');
          
          const isCompleted = currentAssignment?.pharmacyName === pharmacy.name;
          const availablePharmacies = PHARMACIES.filter(p => !currentAssignment?.pharmacyName.includes(p.name));
          const isCurrentlyAssigned = currentAssignment?.pharmacyName === pharmacy.name;
          const isAvailable = availablePharmacies.some(p => p.name === pharmacy.name);
          const isNext = isAvailable && currentAssignment?.dayNumber === index + 1;

          // Update status text
          if (isCompleted) {
            dateText.textContent = 'Completed';
            dateText.setAttribute('fill', 'white');
          } else if (isCurrentlyAssigned) {
            dateText.textContent = 'Current';
            dateText.setAttribute('fill', group.color);
          } else if (isNext && isAvailable) {
            dateText.textContent = 'Available Next';
            dateText.setAttribute('fill', '#22c55e');
          } else if (!isAvailable) {
            dateText.textContent = 'Occupied';
            dateText.setAttribute('fill', '#666');
          } else {
            dateText.textContent = 'Pending';
            dateText.setAttribute('fill', '#666');
          }

          // Create rotation day text
          const rotationDayText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          rotationDayText.setAttribute('x', x.toString());
          rotationDayText.setAttribute('y', (y + 30).toString());
          rotationDayText.setAttribute('text-anchor', 'middle');
          rotationDayText.setAttribute('font-size', '11');
          rotationDayText.setAttribute('fill', group.color);
          
          if (pharmacySchedule.length > 0) {
            const days = pharmacySchedule.map(item => {
              const description = item.description;
              const dayMatch = description.match(/Day (\d+)/);
              return dayMatch ? dayMatch[1] : '';
            });
            rotationDayText.textContent = `Day${pharmacy.days > 1 ? 's' : ''} ${days.join(', ')}`;
          }

          // If not the last pharmacy, create arrow to next pharmacy
          if (index < PHARMACIES.length - 1) {
            const nextAngle = (2 * Math.PI * (index + 1)) / PHARMACIES.length - Math.PI / 2;
            const nextX = centerX + radius * Math.cos(nextAngle);
            const nextY = centerY + radius * Math.sin(nextAngle);

            // Create curved arrow
            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midAngle = (angle + nextAngle) / 2;
            const controlX = centerX + radius * 1.2 * Math.cos(midAngle);
            const controlY = centerY + radius * 1.2 * Math.sin(midAngle);
            
            const dx = nextX - x;
            const dy = nextY - y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / length;
            const ndy = dy / length;
            const bubbleRadius = 45; // Adjust based on your actual bubble size
            const shortenedEndX = nextX - ndx * bubbleRadius;
            const shortenedEndY = nextY - ndy * bubbleRadius;
            
            const path = `M ${x} ${y} Q ${controlX} ${controlY} ${shortenedEndX} ${shortenedEndY}`;
            arrow.setAttribute('d', path);
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('stroke', group.color);
            arrow.setAttribute('stroke-width', '2');
            arrow.setAttribute('marker-end', `url(#arrowhead-${isCurrentPharmacy ? 'current' : 'default'}-${group.id})`);
            svg.appendChild(arrow);
          } else {
            // Create arrow from last to first pharmacy
            const firstAngle = -Math.PI / 2;
            const firstX = centerX + radius * Math.cos(firstAngle);
            const firstY = centerY + radius * Math.sin(firstAngle);

            const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midAngle = (angle + firstAngle + 2 * Math.PI) / 2;
            const controlX = centerX + radius * 1.2 * Math.cos(midAngle);
            const controlY = centerY + radius * 1.2 * Math.sin(midAngle);
            
            const dx = firstX - x;
            const dy = firstY - y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / length;
            const ndy = dy / length;
            const bubbleRadius = 45; // Adjust based on your actual bubble size
            const shortenedEndX = firstX - ndx * bubbleRadius;
            const shortenedEndY = firstY - ndy * bubbleRadius;
            
            const path = `M ${x} ${y} Q ${controlX} ${controlY} ${shortenedEndX} ${shortenedEndY}`;
            arrow.setAttribute('d', path);
            arrow.setAttribute('fill', 'none');
            arrow.setAttribute('stroke', group.color);
            arrow.setAttribute('stroke-width', '2');
            arrow.setAttribute('marker-end', `url(#arrowhead-${isCurrentPharmacy ? 'current' : 'default'}-${group.id})`);
            svg.appendChild(arrow);
          }

          bubble.appendChild(circle);
          bubble.appendChild(text);
          bubble.appendChild(daysText);
          bubble.appendChild(dateText);
          bubble.appendChild(rotationDayText);
          svg.appendChild(bubble);
        });

        // Add arrow marker definitions for this group
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        // Default arrow marker
        const defaultMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        defaultMarker.setAttribute('id', `arrowhead-default-${group.id}`);
        defaultMarker.setAttribute('markerWidth', '12');
        defaultMarker.setAttribute('markerHeight', '8');
        defaultMarker.setAttribute('refX', '10');
        defaultMarker.setAttribute('refY', '4');
        defaultMarker.setAttribute('orient', 'auto');
        
        const defaultPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        defaultPolygon.setAttribute('points', '0 0, 12 4, 0 8');
        defaultPolygon.setAttribute('fill', 'rgba(255, 255, 255, 0.3)');
        
        defaultMarker.appendChild(defaultPolygon);
        defs.appendChild(defaultMarker);

        // Current arrow marker
        const currentMarker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        currentMarker.setAttribute('id', `arrowhead-current-${group.id}`);
        currentMarker.setAttribute('markerWidth', '10'); // Reduced from 12
        currentMarker.setAttribute('markerHeight', '6'); // Reduced from 8
        currentMarker.setAttribute('refX', '8'); // Adjusted from 10
        currentMarker.setAttribute('refY', '3'); // Adjusted from 4
        currentMarker.setAttribute('orient', 'auto');
        
        const currentPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        currentPolygon.setAttribute('points', '0 0, 12 4, 0 8');
        currentPolygon.setAttribute('fill', group.color);
        // Add opacity
        currentPolygon.setAttribute('opacity', '0.7');
        
        currentMarker.appendChild(currentPolygon);
        defs.appendChild(currentMarker);

        svg.appendChild(defs);

        tempDiv.appendChild(svg);
        document.body.appendChild(tempDiv);

        // Generate image
        const canvas = await html2canvas(tempDiv, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher quality
        });

        // Convert to image and download
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `${group.name.toLowerCase().replace(/\s+/g, '-')}-cycle-${new Date().toISOString().split('T')[0]}.png`;
        link.click();

        // Clean up
        document.body.removeChild(tempDiv);
      }

      toast.success(targetGroup ? 'Generated cycle visualization for group' : 'Generated cycle visualizations for all groups');
    } catch (error) {
      console.error('Error generating cycle visualizations:', error);
      toast.error('Failed to generate cycle visualizations');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container px-4 mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
            Pharmacy Rotation Management
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Manage and visualize pharmacy rotations for all groups
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm ring-1 ring-gray-900/5">
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="w-full justify-start border-b px-4 pt-4">
              <TabsTrigger value="schedule" className="data-[state=active]:bg-primary/10 rounded-t-lg">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="admin" className="data-[state=active]:bg-primary/10 rounded-t-lg">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </TabsTrigger>
              <TabsTrigger value="visualization" className="data-[state=active]:bg-primary/10 rounded-t-lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Visualization
              </TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-semibold">Rotation Schedule</h3>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full sm:w-auto"
                    />
                    <Button onClick={generateSchedule} className="w-full sm:w-auto">
                      <Calendar className="w-4 h-4 mr-2" />
                      Generate Schedule
                    </Button>
                  </div>
                </div>
                <ScheduleDisplay schedule={schedule} groups={groups} />
              </div>
            </TabsContent>

            <TabsContent value="admin" className="p-6">
              <div className="space-y-8">
                {/* Groups Management */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Groups
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="text"
                      placeholder="Enter group name"
                      value={newGroup}
                      onChange={(e) => setNewGroup(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addGroup()}
                      className="w-full sm:w-80"
                    />
                    <Button onClick={addGroup} className="w-full sm:w-auto">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Group
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {groups.map(group => (
                      <div 
                        key={group.id} 
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-900/5 p-6"
                        style={{ borderTop: `4px solid ${group.color}` }}
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h4 className="text-lg font-medium">{group.name}</h4>
                          <Button variant="destructive" size="sm" onClick={() => removeGroup(group.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {users.filter(u => !u.groupId).length > 0 && (
                            <Select onValueChange={(value) => addUserToGroup(value, group.id)}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Add user to group" />
                              </SelectTrigger>
                              <SelectContent>
                                {users.filter(u => !u.groupId).map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="space-y-2">
                            {users.filter(u => u.groupId === group.id).map(user => (
                              <div key={user.id} 
                                className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-900 rounded-md"
                              >
                                <span className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-gray-500" />
                                  {user.name}
                                </span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => removeUserFromGroup(user.id)}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User Management */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Users
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="text"
                      placeholder="Enter user name"
                      value={newUser}
                      onChange={(e) => setNewUser(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addUser()}
                      className="w-full sm:w-80"
                    />
                    <Button onClick={addUser} className="w-full sm:w-auto">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users.map(user => (
                      <div key={user.id} 
                        className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm ring-1 ring-gray-900/5"
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          {user.name}
                        </span>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => removeUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="visualization" className="p-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <h3 className="text-xl font-semibold">Rotation Visualization</h3>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button 
                      onClick={() => generateCycleImage()}
                      disabled={!groups.length}
                      className="w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All Cycles
                    </Button>
                    <Button 
                      onClick={() => generateGroupPharmacyImages()}
                      disabled={!groups.length || !schedule.length}
                      className="w-full sm:w-auto"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All Schedules
                    </Button>
                  </div>
                </div>
                
                <Card className="bg-white dark:bg-gray-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Group Rotation Bubbles
                    </CardTitle>
                    <CardDescription>
                      Interactive visualization of rotation groups. Hover over bubbles to see group details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <RotationBubble schedule={schedule} groups={groups} users={users} />
                    </div>
                  </CardContent>
                </Card>

                {/* Group Schedule Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {groups.map(group => {
                    const groupUsers = users.filter(u => u.groupId === group.id);
                    const groupScheduleItems = schedule.filter(item => item.groupId === group.id);
                    
                    return (
                      <Card key={group.id} className="bg-white dark:bg-gray-800">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2" style={{ color: group.color }}>
                            <Users className="w-5 h-5" />
                            {group.name}
                          </CardTitle>
                          <CardDescription>
                            {groupUsers.length} members · {groupScheduleItems.length} assignments
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {PHARMACIES.map(pharmacy => {
                              const count = groupScheduleItems.filter(
                                item => item.pharmacy === pharmacy.name
                              ).length;
                              
                              return (
                                <div 
                                  key={pharmacy.name} 
                                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                                >
                                  <span className="flex items-center gap-2">
                                    <div 
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: group.color }}
                                    />
                                    {pharmacy.name}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {count} assignments
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Export Dialog */}
        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Schedule
              </DialogTitle>
              <DialogDescription>
                Select which users to include in the exported schedule
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox 
                  id="select-all" 
                  checked={selectAllUsers}
                  onCheckedChange={toggleSelectAllUsers}
                />
                <Label htmlFor="select-all" className="font-medium">Select All Users</Label>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Checkbox 
                      id={`user-${user.id}`} 
                      checked={user.selected}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <Label htmlFor={`user-${user.id}`} className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-500" />
                      {user.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExportDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={exportAsImage}
                disabled={selectedUsersForExport.length === 0}
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Selected
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Data Dialog */}
        <Dialog open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Clear All Data
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. All data will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="flex flex-col sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setClearDataDialogOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                variant="destructive"
                onClick={() => {
                  clearAllData();
                  setClearDataDialogOpen(false);
                }}
                className="w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}