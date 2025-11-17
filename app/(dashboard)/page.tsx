'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart3, MessageSquare, Users, TrendingUp } from 'lucide-react';
import { useActiveOrganization } from '@/hooks/use-organizations';

export default function DashboardPage() {
  const { activeOrganization } = useActiveOrganization();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s an overview of your{' '}
          {activeOrganization?.name || 'organization'}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Prompts</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No prompts created yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeOrganization?.members?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeOrganization?.members?.length === 1
                ? 'Just you'
                : 'Team members'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No API activity yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Not enough data</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>
              Welcome to your new organization! Here&apos;s how to get started.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 rounded-md border p-4">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Create your first prompt
                </p>
                <p className="text-sm text-muted-foreground">
                  Start by creating an AI prompt template to manage your prompts
                  efficiently.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 rounded-md border p-4">
              <Users className="h-8 w-8 text-green-600" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Invite team members
                </p>
                <p className="text-sm text-muted-foreground">
                  Collaborate with your team by inviting them to your
                  organization.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4 rounded-md border p-4">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  Set up API keys
                </p>
                <p className="text-sm text-muted-foreground">
                  Configure API keys to integrate with external services.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Organization details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Name</span>
                <span className="text-sm text-muted-foreground">
                  {activeOrganization?.name || 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Members</span>
                <span className="text-sm text-muted-foreground">
                  {activeOrganization?.members?.length || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Status</span>
                <span className="text-sm text-green-600">Active</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
