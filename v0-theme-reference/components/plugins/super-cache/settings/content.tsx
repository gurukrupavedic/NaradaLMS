"use client"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Settings, Zap, Route, Save, RotateCcw, Trash2, Code, Plus, X } from "lucide-react"

export function SuperCacheSettingsContent() {
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [defaultTtl, setDefaultTtl] = useState("3600")
  const [maxSize, setMaxSize] = useState("500")
  const [controllerRules, setControllerRules] = useState([
    {
      id: 1,
      controller: "HomeController",
      function: "index",
      ttl: "7200",
      enabled: true,
      conditions: ["public", "authenticated"],
    },
    {
      id: 2,
      controller: "PostController",
      function: "show",
      ttl: "3600",
      enabled: true,
      conditions: ["public"],
    },
  ])

  const [routeRules, setRouteRules] = useState([
    {
      id: 1,
      pattern: "^/posts/([0-9]+)$",
      rewrite: "/post/$1",
      ttl: "3600",
      enabled: true,
    },
    {
      id: 2,
      pattern: "^/category/(.+)$",
      rewrite: "/posts?category=$1",
      ttl: "1800",
      enabled: true,
    },
  ])

  const addControllerRule = () => {
    const newRule = {
      id: Date.now(),
      controller: "",
      function: "",
      ttl: "3600",
      enabled: true,
      conditions: [],
    }
    setControllerRules([...controllerRules, newRule])
  }

  const removeControllerRule = (id: number) => {
    setControllerRules(controllerRules.filter((rule) => rule.id !== id))
  }

  const addRouteRule = () => {
    const newRule = {
      id: Date.now(),
      pattern: "",
      rewrite: "",
      ttl: "3600",
      enabled: true,
    }
    setRouteRules([...routeRules, newRule])
  }

  const removeRouteRule = (id: number) => {
    setRouteRules(routeRules.filter((rule) => rule.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-600" />
            Super Cache Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Cấu hình cache nâng cao cho website</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear Cache
          </Button>
          <Button size="sm">
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">1,247</div>
            <div className="text-xs text-gray-600">Cache Items</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">94.2%</div>
            <div className="text-xs text-gray-600">Hit Rate</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">5.8%</div>
            <div className="text-xs text-gray-600">Miss Rate</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">342MB</div>
            <div className="text-xs text-gray-600">Cache Size</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">45ms</div>
            <div className="text-xs text-gray-600">Avg Response</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">99.9%</div>
            <div className="text-xs text-gray-600">Uptime</div>
          </div>
        </Card>
      </div>

      {/* Main Settings */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">Tổng quan</TabsTrigger>
          <TabsTrigger value="controllers">Controllers</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="advanced">Nâng cao</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cài đặt cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Kích hoạt Cache</Label>
                  <p className="text-xs text-gray-600">Bật/tắt hệ thống cache</p>
                </div>
                <Switch checked={cacheEnabled} onCheckedChange={setCacheEnabled} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="default-ttl">Thời gian cache mặc định (giây)</Label>
                  <Input
                    id="default-ttl"
                    value={defaultTtl}
                    onChange={(e) => setDefaultTtl(e.target.value)}
                    placeholder="3600"
                  />
                </div>
                <div>
                  <Label htmlFor="max-size">Kích thước tối đa (MB)</Label>
                  <Input id="max-size" value={maxSize} onChange={(e) => setMaxSize(e.target.value)} placeholder="500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cleanup-interval">Khoảng thời gian dọn dẹp (phút)</Label>
                  <Input id="cleanup-interval" defaultValue="60" />
                </div>
                <div>
                  <Label htmlFor="cache-driver">Cache Driver</Label>
                  <Select defaultValue="redis">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="redis">Redis</SelectItem>
                      <SelectItem value="memcached">Memcached</SelectItem>
                      <SelectItem value="file">File System</SelectItem>
                      <SelectItem value="database">Database</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Nén dữ liệu</Label>
                    <p className="text-xs text-gray-600">Sử dụng gzip để nén cache</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Tự động dọn dẹp</Label>
                    <p className="text-xs text-gray-600">Xóa cache hết hạn tự động</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Debug Mode</Label>
                    <p className="text-xs text-gray-600">Hiển thị thông tin debug</p>
                  </div>
                  <Switch />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Controllers Settings */}
        <TabsContent value="controllers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Cấu hình Cache theo Controller
                </CardTitle>
                <Button size="sm" onClick={addControllerRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {controllerRules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Controller</Label>
                          <Input
                            value={rule.controller}
                            onChange={(e) => {
                              const updated = controllerRules.map((r) =>
                                r.id === rule.id ? { ...r, controller: e.target.value } : r,
                              )
                              setControllerRules(updated)
                            }}
                            placeholder="HomeController"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Function</Label>
                          <Input
                            value={rule.function}
                            onChange={(e) => {
                              const updated = controllerRules.map((r) =>
                                r.id === rule.id ? { ...r, function: e.target.value } : r,
                              )
                              setControllerRules(updated)
                            }}
                            placeholder="index"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">TTL (giây)</Label>
                          <Input
                            value={rule.ttl}
                            onChange={(e) => {
                              const updated = controllerRules.map((r) =>
                                r.id === rule.id ? { ...r, ttl: e.target.value } : r,
                              )
                              setControllerRules(updated)
                            }}
                            placeholder="3600"
                            className="h-8"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Điều kiện</Label>
                          <div className="flex gap-1 flex-wrap">
                            {["public", "authenticated", "mobile", "paginated"].map((condition) => (
                              <Badge
                                key={condition}
                                variant={rule.conditions.includes(condition) ? "default" : "outline"}
                                className="text-xs cursor-pointer"
                                onClick={() => {
                                  const updated = controllerRules.map((r) => {
                                    if (r.id === rule.id) {
                                      const conditions = r.conditions.includes(condition)
                                        ? r.conditions.filter((c) => c !== condition)
                                        : [...r.conditions, condition]
                                      return { ...r, conditions }
                                    }
                                    return r
                                  })
                                  setControllerRules(updated)
                                }}
                              >
                                {condition}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => {
                            const updated = controllerRules.map((r) =>
                              r.id === rule.id ? { ...r, enabled: checked } : r,
                            )
                            setControllerRules(updated)
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeControllerRule(rule.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Routes Settings */}
        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" />
                  Cấu hình Route Rewrite
                </CardTitle>
                <Button size="sm" onClick={addRouteRule}>
                  <Plus className="h-4 w-4 mr-2" />
                  Thêm Route
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routeRules.map((rule) => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 grid grid-cols-3 gap-4">
                        <div>
                          <Label className="text-xs">Pattern (Regex)</Label>
                          <Input
                            value={rule.pattern}
                            onChange={(e) => {
                              const updated = routeRules.map((r) =>
                                r.id === rule.id ? { ...r, pattern: e.target.value } : r,
                              )
                              setRouteRules(updated)
                            }}
                            placeholder="^/posts/([0-9]+)$"
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Rewrite To</Label>
                          <Input
                            value={rule.rewrite}
                            onChange={(e) => {
                              const updated = routeRules.map((r) =>
                                r.id === rule.id ? { ...r, rewrite: e.target.value } : r,
                              )
                              setRouteRules(updated)
                            }}
                            placeholder="/post/$1"
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">TTL (giây)</Label>
                          <Input
                            value={rule.ttl}
                            onChange={(e) => {
                              const updated = routeRules.map((r) =>
                                r.id === rule.id ? { ...r, ttl: e.target.value } : r,
                              )
                              setRouteRules(updated)
                            }}
                            placeholder="3600"
                            className="h-8"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => {
                            const updated = routeRules.map((r) => (r.id === rule.id ? { ...r, enabled: checked } : r))
                            setRouteRules(updated)
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeRouteRule(rule.id)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Cache Headers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cache Headers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Cache-Control</Label>
                  <Input defaultValue="public, max-age=3600" className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">ETag</Label>
                  <Select defaultValue="enabled">
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Vary Headers</Label>
                  <Input defaultValue="Accept-Encoding, User-Agent" className="h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Cache Invalidation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cache Invalidation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Auto clear on post update</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Clear related pages</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div>
                  <Label className="text-xs">Invalidation Events</Label>
                  <Textarea placeholder="post.updated&#10;user.login&#10;comment.created" className="h-20 text-xs" />
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Connection Pool Size</Label>
                  <Input defaultValue="10" className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Serialization</Label>
                  <Select defaultValue="json">
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="serialize">PHP Serialize</SelectItem>
                      <SelectItem value="msgpack">MessagePack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Persistent connections</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Monitoring */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Enable logging</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div>
                  <Label className="text-xs">Log Level</Label>
                  <Select defaultValue="info">
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Collect metrics</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
