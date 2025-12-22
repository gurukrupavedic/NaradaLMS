"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InstalledPlugins } from "./installed-plugins"
import { AddNewPlugin } from "./add-new-plugin"
import { Package, Plus } from "lucide-react"

export function PluginsContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Plugins</h1>
          <p className="text-gray-600 dark:text-gray-400">Cài đặt và quản lý các plugins cho hệ thống CMS</p>
        </div>
      </div>

      <Tabs defaultValue="installed" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Plugins đã cài
          </TabsTrigger>
          <TabsTrigger value="add-new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Thêm mới
          </TabsTrigger>
        </TabsList>

        <TabsContent value="installed" className="mt-4">
          <InstalledPlugins />
        </TabsContent>

        <TabsContent value="add-new" className="mt-4">
          <AddNewPlugin />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PluginsContent
