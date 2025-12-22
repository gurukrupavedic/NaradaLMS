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
import { Search, Code, FileText, Map, Settings, Save, RotateCcw, Eye, Plus, X } from "lucide-react"

export function AllSiteSEOSettingsContent() {
  const [seoEnabled, setSeoEnabled] = useState(true)
  const [controllerRules, setControllerRules] = useState([
    {
      id: 1,
      controller: "HomeController",
      function: "index",
      titleTemplate: "{site_name} - {tagline}",
      descriptionTemplate: "Welcome to {site_name}. {description}",
      status: "configured",
      enabled: true,
    },
    {
      id: 2,
      controller: "PostController",
      function: "show",
      titleTemplate: "{post_title} - {site_name}",
      descriptionTemplate: "{post_excerpt} | {site_name}",
      status: "configured",
      enabled: true,
    },
    {
      id: 3,
      controller: "CategoryController",
      function: "index",
      titleTemplate: "{category_name} - {site_name}",
      descriptionTemplate: "Browse {category_name} articles on {site_name}",
      status: "partial",
      enabled: false,
    },
  ])

  const [postTypes, setPostTypes] = useState([
    {
      id: 1,
      name: "Posts",
      slug: "posts",
      count: 1247,
      urlTemplate: "/posts/{slug}",
      titleTemplate: "{title} - {site_name}",
      autoDescription: true,
      robotsMeta: "index,follow",
      enabled: true,
    },
    {
      id: 2,
      name: "Pages",
      slug: "pages",
      count: 23,
      urlTemplate: "/{slug}",
      titleTemplate: "{title} - {site_name}",
      autoDescription: true,
      robotsMeta: "index,follow",
      enabled: true,
    },
    {
      id: 3,
      name: "Products",
      slug: "products",
      count: 456,
      urlTemplate: "/products/{slug}",
      titleTemplate: "{title} - Shop {site_name}",
      autoDescription: false,
      robotsMeta: "index,follow",
      enabled: true,
    },
  ])

  const [schemaTemplates, setSchemaTemplates] = useState([
    {
      id: 1,
      name: "Article",
      type: "Article",
      usage: 1247,
      enabled: true,
      template: `{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{title}",
  "description": "{description}",
  "author": {
    "@type": "Person",
    "name": "{author_name}"
  },
  "datePublished": "{published_date}",
  "dateModified": "{modified_date}"
}`,
    },
    {
      id: 2,
      name: "Product",
      type: "Product",
      usage: 456,
      enabled: true,
      template: `{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{product_name}",
  "description": "{product_description}",
  "offers": {
    "@type": "Offer",
    "price": "{price}",
    "priceCurrency": "{currency}"
  }
}`,
    },
  ])

  const addControllerRule = () => {
    const newRule = {
      id: Date.now(),
      controller: "",
      function: "",
      titleTemplate: "",
      descriptionTemplate: "",
      status: "not_configured",
      enabled: true,
    }
    setControllerRules([...controllerRules, newRule])
  }

  const removeControllerRule = (id: number) => {
    setControllerRules(controllerRules.filter((rule) => rule.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Search className="h-6 w-6 text-green-600" />
            AllSite SEO Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Cấu hình SEO toàn diện cho website</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
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
            <div className="text-2xl font-bold text-blue-600">1,726</div>
            <div className="text-xs text-gray-600">Total Pages</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">1,523</div>
            <div className="text-xs text-gray-600">Optimized</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">87.2</div>
            <div className="text-xs text-gray-600">SEO Score</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">1.2s</div>
            <div className="text-xs text-gray-600">Load Time</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">24.5K</div>
            <div className="text-xs text-gray-600">Traffic</div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">342</div>
            <div className="text-xs text-gray-600">Keywords</div>
          </div>
        </Card>
      </div>

      {/* Main Settings */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">Tổng quan</TabsTrigger>
          <TabsTrigger value="controllers">Controllers</TabsTrigger>
          <TabsTrigger value="posttypes">Post Types</TabsTrigger>
          <TabsTrigger value="schema">Schema</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
          <TabsTrigger value="advanced">Nâng cao</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cài đặt chung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Kích hoạt SEO</Label>
                  <p className="text-xs text-gray-600">Bật/tắt tất cả tính năng SEO</p>
                </div>
                <Switch checked={seoEnabled} onCheckedChange={setSeoEnabled} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="site-title">Site Title</Label>
                  <Input id="site-title" defaultValue="My Awesome Website" />
                </div>
                <div>
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" defaultValue="Just another WordPress site" />
                </div>
              </div>

              <div>
                <Label htmlFor="site-description">Site Description</Label>
                <Textarea
                  id="site-description"
                  defaultValue="A comprehensive website offering valuable content and services to our visitors."
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title-separator">Title Separator</Label>
                  <Select defaultValue="-">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">- (Dash)</SelectItem>
                      <SelectItem value="|">| (Pipe)</SelectItem>
                      <SelectItem value="•">• (Bullet)</SelectItem>
                      <SelectItem value="~">~ (Tilde)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="default-keywords">Default Keywords</Label>
                  <Input id="default-keywords" placeholder="website, blog, content" />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Meta Tags mặc định</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="meta-author">Author</Label>
                    <Input id="meta-author" defaultValue="Website Admin" />
                  </div>
                  <div>
                    <Label htmlFor="meta-robots">Robots</Label>
                    <Select defaultValue="index,follow">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="index,follow">index,follow</SelectItem>
                        <SelectItem value="noindex,nofollow">noindex,nofollow</SelectItem>
                        <SelectItem value="index,nofollow">index,nofollow</SelectItem>
                        <SelectItem value="noindex,follow">noindex,follow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Open Graph</Label>
                    <p className="text-xs text-gray-600">Facebook sharing optimization</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Twitter Cards</Label>
                    <p className="text-xs text-gray-600">Twitter sharing optimization</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Mạng xã hội</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="facebook-url">Facebook URL</Label>
                    <Input id="facebook-url" placeholder="https://facebook.com/yourpage" />
                  </div>
                  <div>
                    <Label htmlFor="twitter-url">Twitter URL</Label>
                    <Input id="twitter-url" placeholder="https://twitter.com/youraccount" />
                  </div>
                  <div>
                    <Label htmlFor="instagram-url">Instagram URL</Label>
                    <Input id="instagram-url" placeholder="https://instagram.com/youraccount" />
                  </div>
                  <div>
                    <Label htmlFor="linkedin-url">LinkedIn URL</Label>
                    <Input id="linkedin-url" placeholder="https://linkedin.com/company/yourcompany" />
                  </div>
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
                  Cấu hình SEO theo Controller
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
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        <div>
                          <Label className="text-xs">Title Template</Label>
                          <Input
                            value={rule.titleTemplate}
                            onChange={(e) => {
                              const updated = controllerRules.map((r) =>
                                r.id === rule.id ? { ...r, titleTemplate: e.target.value } : r,
                              )
                              setControllerRules(updated)
                            }}
                            placeholder="{post_title} - {site_name}"
                            className="h-8 font-mono text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Meta Description Template</Label>
                          <Textarea
                            value={rule.descriptionTemplate}
                            onChange={(e) => {
                              const updated = controllerRules.map((r) =>
                                r.id === rule.id ? { ...r, descriptionTemplate: e.target.value } : r,
                              )
                              setControllerRules(updated)
                            }}
                            placeholder="{post_excerpt} | {site_name}"
                            className="h-16 font-mono text-xs"
                          />
                        </div>
                        <div className="text-xs text-gray-500">
                          Variables:{" "}
                          {"{site_name}, {post_title}, {post_excerpt}, {author_name}, {category_name}, {tagline}"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            rule.status === "configured"
                              ? "default"
                              : rule.status === "partial"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {rule.status === "configured"
                            ? "Configured"
                            : rule.status === "partial"
                              ? "Partial"
                              : "Not configured"}
                        </Badge>
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

        {/* Post Types Settings */}
        <TabsContent value="posttypes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cấu hình SEO theo Post Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {postTypes.map((postType) => (
                  <Card key={postType.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <h4 className="font-semibold">{postType.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {postType.count} items
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">URL Structure</Label>
                            <Input value={postType.urlTemplate} className="h-8 font-mono text-xs" readOnly />
                          </div>
                          <div>
                            <Label className="text-xs">Title Template</Label>
                            <Input value={postType.titleTemplate} className="h-8 font-mono text-xs" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Robots Meta</Label>
                            <Select value={postType.robotsMeta}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="index,follow">index,follow</SelectItem>
                                <SelectItem value="noindex,nofollow">noindex,nofollow</SelectItem>
                                <SelectItem value="index,nofollow">index,nofollow</SelectItem>
                                <SelectItem value="noindex,follow">noindex,follow</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Switch checked={postType.autoDescription} />
                              <Label className="text-xs">Auto Description</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch checked={postType.enabled} />
                              <Label className="text-xs">Enabled</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schema Settings */}
        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Schema.org Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schemaTemplates.map((schema) => (
                  <Card key={schema.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <h4 className="font-semibold">{schema.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {schema.type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {schema.usage} uses
                            </Badge>
                          </div>
                          <Switch checked={schema.enabled} />
                        </div>
                        <div>
                          <Label className="text-xs">JSON-LD Template</Label>
                          <Textarea value={schema.template} className="h-32 font-mono text-xs" readOnly />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                          <Button variant="outline" size="sm">
                            Edit Template
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sitemap Settings */}
        <TabsContent value="sitemap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                XML Sitemap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Enable XML Sitemap</Label>
                  <p className="text-xs text-gray-600">Generate XML sitemap automatically</p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Content Inclusion</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Posts</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Pages</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Categories</Label>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Tags</Label>
                    <Switch />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="font-medium">Search Engine Ping</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Auto-ping Google</Label>
                    <p className="text-xs text-gray-600">Notify Google when sitemap updates</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Auto-ping Bing</Label>
                    <p className="text-xs text-gray-600">Notify Bing when sitemap updates</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Eye className="h-4 w-4 mr-2" />
                  View Sitemap
                </Button>
                <Button variant="outline" size="sm">
                  Regenerate
                </Button>
                <span className="text-xs text-gray-500">Last generated: 2024-01-15 10:30 AM</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Lazy load images</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Minify HTML</Label>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Compress images</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div>
                  <Label className="text-xs">Image quality (%)</Label>
                  <Input defaultValue="85" className="h-8" />
                </div>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Google Analytics ID</Label>
                  <Input placeholder="GA-XXXXXXXXX-X" className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Google Tag Manager ID</Label>
                  <Input placeholder="GTM-XXXXXXX" className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Facebook Pixel ID</Label>
                  <Input placeholder="123456789012345" className="h-8" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Track logged-in users</Label>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            {/* Redirects */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Redirects & URLs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Auto redirect 404s</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Force canonical URLs</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div>
                  <Label className="text-xs">Trailing slash</Label>
                  <Select defaultValue="remove">
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="add">Add trailing slash</SelectItem>
                      <SelectItem value="remove">Remove trailing slash</SelectItem>
                      <SelectItem value="ignore">Ignore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Search Console */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search Console</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Google verification code</Label>
                  <Input placeholder="google-site-verification=..." className="h-8" />
                </div>
                <div>
                  <Label className="text-xs">Bing verification code</Label>
                  <Input placeholder="msvalidate.01=..." className="h-8" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs">Auto-submit new URLs</Label>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  Connect Search Console
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
