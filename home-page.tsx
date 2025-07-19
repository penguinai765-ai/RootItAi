"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Home,
  BarChart3,
  Search,
  User,
  Clock,
  Plus,
  ChevronDown,
  BookOpen,
  Calculator,
  Beaker,
  Globe,
  Palette,
  Music,
  Dumbbell,
  Languages,
  Trophy,
  Star,
  Zap,
  Target,
  Play,
  CheckCircle,
} from "lucide-react"

// Mock data
const activeQuizzes = [
  {
    id: 1,
    subject: "Science",
    topic: "Cell Division",
    deadline: "Due in 2h",
    gradient: "from-blue-500 via-blue-600 to-indigo-600",
    isLive: true,
  },
  {
    id: 2,
    subject: "Mathematics",
    topic: "Quadratic Equations",
    deadline: "Due in 4h",
    gradient: "from-green-500 via-emerald-600 to-teal-600",
    isLive: true,
  },
  {
    id: 3,
    subject: "History",
    topic: "World War II",
    deadline: "Due tomorrow",
    gradient: "from-purple-500 via-violet-600 to-purple-700",
    isLive: true,
  },
]

const enrolledSubjects = [
  { name: "Mathematics", icon: Calculator, color: "bg-blue-500", enrolled: true },
  { name: "Science", icon: Beaker, color: "bg-green-500", enrolled: true },
  { name: "History", icon: BookOpen, color: "bg-purple-500", enrolled: true },
  { name: "Geography", icon: Globe, color: "bg-orange-500", enrolled: true },
  { name: "Art", icon: Palette, color: "bg-pink-500", enrolled: false },
  { name: "Music", icon: Music, color: "bg-indigo-500", enrolled: false },
  { name: "Physical Ed", icon: Dumbbell, color: "bg-red-500", enrolled: false },
  { name: "Languages", icon: Languages, color: "bg-cyan-500", enrolled: false },
]

const weeklyXP = 430
const weeklyXPTarget = 500

export function HomePage() {
  const [activeTab, setActiveTab] = useState("home")
  const [activeCardIndex, setActiveCardIndex] = useState(0)

  const handleCardClick = (index: number) => {
    setActiveCardIndex(index)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Top Header */}
      <div className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Welcome, Sahil PS</h1>
              <p className="text-sm text-gray-600 mt-1">Class: 8</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-10 h-10 ring-2 ring-purple-200">
                      <AvatarImage src="/placeholder.svg?height=40&width=40" alt="Sahil PS" />
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold">
                        SP
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Trophy className="w-4 h-4 mr-2" />
                  Achievements
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Target className="w-4 h-4 mr-2" />
                  Goals
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-8 pb-24">
        {/* Active Quiz Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-900">Active Quizzes</h2>
            {activeQuizzes.length > 0 && (
              <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1 animate-pulse"></div>
                {activeQuizzes.length} Live
              </Badge>
            )}
          </div>

          {activeQuizzes.length > 0 ? (
            <div className="relative h-[240px] mb-8">
              {/* Card Stack Container */}
              <div className="relative w-full max-w-[340px] mx-auto h-full">
                {activeQuizzes.map((quiz, index) => {
                  const isActive = index === activeCardIndex
                  const offset = index - activeCardIndex

                  return (
                    <div
                      key={quiz.id}
                      className={`absolute top-0 left-0 w-full transition-all duration-500 ease-out cursor-pointer ${
                        isActive ? "z-30" : "z-20"
                      }`}
                      style={{
                        transform: `
                translateX(${offset * 12}px) 
                translateY(${Math.abs(offset) * 6}px) 
                scale(${isActive ? 1 : 0.96 - Math.abs(offset) * 0.03})
              `,
                        opacity: Math.abs(offset) > 2 ? 0 : 1 - Math.abs(offset) * 0.15,
                      }}
                      onClick={() => handleCardClick(index)}
                    >
                      <Card
                        className={`w-full h-[200px] border-0 bg-gradient-to-br ${quiz.gradient} shadow-2xl hover:shadow-3xl transition-all duration-300 relative overflow-hidden group`}
                      >
                        {/* Glowing effect */}
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${quiz.gradient} rounded-xl blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300 -z-10 scale-110`}
                        ></div>

                        {/* Card shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-60"></div>

                        <CardContent className="p-6 h-full flex flex-col justify-between relative z-10">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <Badge className="bg-red-500 hover:bg-red-500 text-white text-xs px-3 py-1.5 font-bold shadow-lg border border-red-400">
                                🔴 LIVE
                              </Badge>
                              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30">
                                <div className="w-3 h-3 bg-white rounded-full"></div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h3 className="font-bold text-white text-2xl tracking-wide drop-shadow-sm">
                                {quiz.subject}
                              </h3>
                              <p className="text-white/90 text-base font-medium">{quiz.topic}</p>
                            </div>

                            <div className="flex items-center gap-2 text-white/90">
                              <Clock className="w-4 h-4" />
                              <span className="text-sm font-medium">{quiz.deadline}</span>
                            </div>
                          </div>

                          <Button className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl font-bold py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl">
                            <Play className="w-5 h-5 mr-2" />
                            Attend Now
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>

              {/* Card indicators */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {activeQuizzes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => handleCardClick(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === activeCardIndex ? "bg-purple-600 w-6" : "bg-gray-300 hover:bg-gray-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="relative h-[240px] mb-8">
              <div className="w-full max-w-[340px] mx-auto h-full flex items-center">
                <Card className="w-full h-[200px] border-0 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 shadow-2xl relative overflow-hidden">
                  {/* Glowing effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-xl blur-xl opacity-50 -z-10 scale-110"></div>

                  {/* Card shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent opacity-60"></div>

                  <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center relative z-10 space-y-4">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 mb-2">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-bold text-white text-xl drop-shadow-sm">You're all caught up! 🎉</h3>
                      <p className="text-white/90 text-sm">Great job staying on top of your quizzes</p>
                    </div>
                    <Button className="bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl font-bold px-6 py-3 backdrop-blur-sm transition-all duration-300 hover:scale-105 shadow-lg">
                      Continue My Learning
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </section>

        {/* Enrolled Subjects Grid */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">My Subjects</h2>
          <div className="grid grid-cols-2 gap-4">
            {enrolledSubjects.map((subject) => {
              const IconComponent = subject.icon
              return (
                <Card
                  key={subject.name}
                  className={`shadow-lg border-0 transition-all duration-300 hover:scale-105 ${
                    subject.enrolled
                      ? "bg-white hover:shadow-xl cursor-pointer"
                      : "bg-gray-50 opacity-60 cursor-pointer hover:opacity-80"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center space-y-3">
                      {subject.enrolled ? (
                        <div
                          className={`w-12 h-12 ${subject.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded-2xl flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                          <Plus className="w-6 h-6" />
                        </div>
                      )}
                      <div>
                        <h3 className={`font-semibold text-sm ${subject.enrolled ? "text-gray-900" : "text-gray-500"}`}>
                          {subject.name}
                        </h3>
                        {!subject.enrolled && <p className="text-xs text-gray-400 mt-1">Tap to enroll</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* Progress Tracker Section */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Progress</h2>
          <Card className="shadow-lg border-0 bg-gradient-to-r from-yellow-50 to-orange-50">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900">Weekly XP</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">
                      {weeklyXP} / {weeklyXPTarget}
                    </div>
                    <div className="text-xs text-gray-600">{weeklyXPTarget - weeklyXP} XP to go</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Progress value={(weeklyXP / weeklyXPTarget) * 100} className="h-3 bg-gray-200" />
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>0 XP</span>
                    <span>{weeklyXPTarget} XP</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-gray-700">
                    You're <span className="font-semibold text-orange-600">86%</span> towards your weekly goal!
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="flex justify-around py-2">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === "home" ? "text-purple-600 bg-purple-50" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Home</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === "analytics" ? "text-purple-600 bg-purple-50" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab("discover")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === "discover" ? "text-purple-600 bg-purple-50" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <Search className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Discover</span>
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === "profile" ? "text-purple-600 bg-purple-50" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs mt-1 font-medium">Profile</span>
          </button>
        </div>
      </div>
    </div>
  )
}
