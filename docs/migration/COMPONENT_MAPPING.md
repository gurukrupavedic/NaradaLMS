# DaisyUI Component Mapping Reference

## Complete shadcn/ui to DaisyUI Migration Guide

### Basic Components

#### Button
```tsx
// Before (shadcn/ui)
<Button variant="default" size="lg" className="w-full">
  Submit
</Button>

// After (DaisyUI)
<button className="btn btn-primary btn-lg btn-block">
  Submit
</button>
```

#### Card
```tsx
// Before (shadcn/ui)
<Card className="w-full">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>

// After (DaisyUI)
<div className="card w-full bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p className="text-base-content/70">Description</p>
    <p>Content</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Action</button>
    </div>
  </div>
</div>
```

#### Input
```tsx
// Before (shadcn/ui)
<Input
  type="text"
  placeholder="Enter text"
  className="w-full"
/>

// After (DaisyUI)
<input
  type="text"
  placeholder="Enter text"
  className="input input-bordered w-full"
/>
```

#### Badge
```tsx
// Before (shadcn/ui)
<Badge variant="secondary">
  Published
</Badge>

// After (DaisyUI)
<div className="badge badge-secondary">
  Published
</div>
```

### Form Components

#### Form Field
```tsx
// Before (shadcn/ui)
<FormField
  control={form.control}
  name="title"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Chapter Title</FormLabel>
      <FormControl>
        <Input placeholder="Enter title" {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>

// After (DaisyUI)
<div className="form-control w-full">
  <label className="label">
    <span className="label-text">Chapter Title</span>
  </label>
  <input
    type="text"
    placeholder="Enter title"
    className="input input-bordered w-full"
    {...register("title")}
  />
  {errors.title && (
    <label className="label">
      <span className="label-text-alt text-error">
        {errors.title.message}
      </span>
    </label>
  )}
</div>
```

#### Select
```tsx
// Before (shadcn/ui)
<Select value={script} onValueChange={setScript}>
  <SelectTrigger>
    <SelectValue placeholder="Select script" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="te">Telugu</SelectItem>
    <SelectItem value="hi">Hindi</SelectItem>
    <SelectItem value="en">English</SelectItem>
  </SelectContent>
</Select>

// After (DaisyUI)
<select
  className="select select-bordered w-full"
  value={script}
  onChange={(e) => setScript(e.target.value)}
>
  <option disabled value="">Select script</option>
  <option value="te">Telugu</option>
  <option value="hi">Hindi</option>
  <option value="en">English</option>
</select>
```

### Layout Components

#### Tabs
```tsx
// Before (shadcn/ui)
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="content">Content</TabsTrigger>
    <TabsTrigger value="audio">Audio Mapping</TabsTrigger>
    <TabsTrigger value="segments">Segmentation</TabsTrigger>
  </TabsList>
  <TabsContent value="content">
    <ContentEditor />
  </TabsContent>
  <TabsContent value="audio">
    <AudioMapping />
  </TabsContent>
  <TabsContent value="segments">
    <Segmentation />
  </TabsContent>
</Tabs>

// After (DaisyUI)
<div className="tabs tabs-bordered">
  <button
    className={`tab ${activeTab === 'content' ? 'tab-active' : ''}`}
    onClick={() => setActiveTab('content')}
  >
    Content
  </button>
  <button
    className={`tab ${activeTab === 'audio' ? 'tab-active' : ''}`}
    onClick={() => setActiveTab('audio')}
  >
    Audio Mapping
  </button>
  <button
    className={`tab ${activeTab === 'segments' ? 'tab-active' : ''}`}
    onClick={() => setActiveTab('segments')}
  >
    Segmentation
  </button>
</div>

<div className="tab-content mt-4">
  {activeTab === 'content' && <ContentEditor />}
  {activeTab === 'audio' && <AudioMapping />}
  {activeTab === 'segments' && <Segmentation />}
</div>
```

### Dialog/Modal
```tsx
// Before (shadcn/ui)
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>
        Are you sure you want to delete this chapter?
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="destructive" onClick={handleDelete}>
        Delete
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// After (DaisyUI)
<>
  <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
    Open Dialog
  </button>
  
  {isOpen && (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg">Confirm Action</h3>
        <p className="py-4">
          Are you sure you want to delete this chapter?
        </p>
        <div className="modal-action">
          <button className="btn" onClick={() => setIsOpen(false)}>
            Cancel
          </button>
          <button className="btn btn-error" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )}
</>
```

### Progress & Loading

#### Progress
```tsx
// Before (shadcn/ui)
<Progress value={progress} className="w-full" />

// After (DaisyUI)
<progress
  className="progress progress-primary w-full"
  value={progress}
  max="100"
></progress>
```

#### Loading Spinner
```tsx
// Before (shadcn/ui)
<div className="flex items-center justify-center">
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
</div>

// After (DaisyUI)
<div className="flex items-center justify-center">
  <span className="loading loading-spinner loading-lg"></span>
</div>
```

### Toast/Alert
```tsx
// Before (shadcn/ui)
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()
toast({
  title: "Success",
  description: "Chapter saved successfully",
})

// After (DaisyUI)
<div className="toast toast-top toast-end">
  <div className="alert alert-success">
    <span>Chapter saved successfully</span>
  </div>
</div>
```

### Navigation

#### Breadcrumb
```tsx
// Before (shadcn/ui)
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/tracks">Tracks</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Chapter Editor</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>

// After (DaisyUI)
<div className="breadcrumbs text-sm">
  <ul>
    <li><a href="/tracks">Tracks</a></li>
    <li>Chapter Editor</li>
  </ul>
</div>
```

### Vedic LMS Specific Components

#### Track Card
```tsx
// Before (Custom with shadcn/ui)
<Card className="hover:shadow-lg transition-shadow">
  <CardContent className="p-6">
    <h3 className="font-semibold text-lg">{track.title}</h3>
    <p className="text-muted-foreground">{track.description}</p>
    <Badge variant="secondary">{track.chapterCount} chapters</Badge>
  </CardContent>
</Card>

// After (DaisyUI)
<div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
  <div className="card-body">
    <h2 className="card-title">{track.title}</h2>
    <p>{track.description}</p>
    <div className="card-actions justify-between items-center">
      <div className="badge badge-ghost">{track.chapterCount} chapters</div>
      <button className="btn btn-primary btn-sm">Open</button>
    </div>
  </div>
</div>
```

#### Segment Card
```tsx
// Before (Custom with shadcn/ui)
<Card className="border-l-4 border-l-blue-500">
  <CardContent className="p-4">
    <div className="flex justify-between items-start">
      <span className="text-sm font-medium">Segment {index + 1}</span>
      {mappingStatus.isMapped ? (
        <LinkIcon className="h-4 w-4 text-green-600" />
      ) : (
        <LinkOffIcon className="h-4 w-4 text-gray-400" />
      )}
    </div>
    <p className="mt-2">{segment.text}</p>
  </CardContent>
</Card>

// After (DaisyUI)
<div className="card bg-base-100 shadow-sm border-l-4 border-l-primary">
  <div className="card-body p-4">
    <div className="flex justify-between items-start">
      <span className="text-sm font-medium">Segment {index + 1}</span>
      {mappingStatus.isMapped ? (
        <div className="badge badge-success badge-sm">
          <LinkIcon className="h-3 w-3" />
        </div>
      ) : (
        <div className="badge badge-ghost badge-sm">
          <LinkOffIcon className="h-3 w-3" />
        </div>
      )}
    </div>
    <p className="mt-2">{segment.text}</p>
  </div>
</div>
```

## Theme Variants

### Pastel Theme Colors
```css
/* Available DaisyUI Pastel Theme Classes */
.btn-primary     /* Soft purple */
.btn-secondary   /* Soft teal */
.btn-accent      /* Soft pink */
.btn-info        /* Soft blue */
.btn-success     /* Soft green */
.btn-warning     /* Soft yellow */
.btn-error       /* Soft red */

/* Background colors */
.bg-base-100     /* Main background */
.bg-base-200     /* Secondary background */
.bg-base-300     /* Tertiary background */

/* Text colors */
.text-base-content      /* Primary text */
.text-base-content/70   /* Secondary text */
.text-base-content/50   /* Muted text */
```

### Custom Vedic Extensions
```css
/* Custom classes to add after migration */
.btn-vedic-saffron { @apply btn bg-orange-300 hover:bg-orange-400 text-orange-900; }
.btn-vedic-gold { @apply btn bg-yellow-200 hover:bg-yellow-300 text-yellow-900; }
.card-vedic { @apply card border-t-4 border-t-orange-300; }
.badge-vedic { @apply badge bg-orange-100 text-orange-800; }
```