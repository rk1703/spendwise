
"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppContext } from '@/context/AppContext';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit3, Trash2, Tag, Palette, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger as AlertTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  icon: z.string().min(1, 'Icon is required'), // Icon name as string
  color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

// Get available Lucide icons
const iconKeys = Object.keys(LucideIcons).filter(key => key !== 'createLucideIcon' && key !== 'LucideIcon' && /^[A-Z]/.test(key)) as (keyof typeof LucideIcons)[];


const CategoryForm = ({ category, onSave, onCancel }: { category?: Category, onSave: () => void, onCancel: () => void }) => {
  const { addCategory, updateCategory, categories } = useAppContext();
  // selectedIconName is the string name of the icon
  const [selectedIconName, setSelectedIconName] = useState<string>(category?.icon || 'Tag');

  const { control, handleSubmit, register, setValue, watch, formState: { errors, isSubmitting } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      icon: category?.icon || 'Tag', // Use string name
      color: category?.color || `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
    },
  });

  // Dynamically get the component for the preview
  const SelectedIconPreview = LucideIcons[selectedIconName as keyof typeof LucideIcons] || Tag;

  const onSubmit = (data: CategoryFormData) => {
    // data.icon is already the string name. This is what we want to save.
    const categoryData = { ...data };

    if (categories.some(c => c.name.toLowerCase() === data.name.toLowerCase() && c.id !== category?.id)) {
        setValue('name', data.name, { shouldSetTouched: true }); // Ensure an error object exists for name
        errors.name = { type: 'manual', message: 'Category name already exists.' };
        return; // Stop submission
    }

    if (category) {
      updateCategory({ ...categoryData, id: category.id });
    } else {
      addCategory(categoryData);
    }
    onSave();
  };
  
  const handleIconSelect = (iconName: string) => {
    setSelectedIconName(iconName);
    setValue('icon', iconName, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Category Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <Label htmlFor="icon">Icon</Label>
        <Controller
            name="icon" // This now controls the icon name (string)
            control={control}
            render={({ field }) => (
            <Popover>
                <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                    <SelectedIconPreview className="mr-2 h-4 w-4" />
                    {field.value || "Select an icon"} 
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                <ScrollArea className="h-[200px]">
                    <div className="p-2 grid grid-cols-5 gap-1">
                    {iconKeys.map(iconKey => {
                        const Icon = LucideIcons[iconKey];
                        return (
                        <Button
                            key={iconKey}
                            variant="ghost"
                            size="icon"
                            onClick={() => handleIconSelect(iconKey)} // Sets selectedIconName and field.value
                            className={cn("h-8 w-8", field.value === iconKey && "bg-accent text-accent-foreground")}
                        >
                            <Icon className="h-4 w-4" />
                        </Button>
                        );
                    })}
                    </div>
                </ScrollArea>
                </PopoverContent>
            </Popover>
            )}
        />
        {errors.icon && <p className="text-sm text-destructive mt-1">{errors.icon.message}</p>}
      </div>
       <div>
        <Label htmlFor="color">Color</Label>
        <Controller
            name="color"
            control={control}
            render={({ field }) => (
                <Input id="color" type="color" {...field} className="h-10"/>
            )} />
        {errors.color && <p className="text-sm text-destructive mt-1">{errors.color.message}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? 'Save Changes' : 'Add Category'}
        </Button>
      </div>
    </form>
  );
};


export function CategoryManager() {
  const { categories, deleteCategory } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };
  
  const handleFormSave = () => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingCategory(undefined);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-col gap-2 md:flex-row items-center justify-between">
        <div>
            <CardTitle className="flex items-center gap-2 mb-2"><Tag className="text-primary"/>Manage Categories</CardTitle>
            <CardDescription className='tracking-tight md:tracking-normal'>Add, edit, or delete your spending categories.</CardDescription>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleFormCancel(); else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
                <Button onClick={() => { setEditingCategory(undefined); setIsFormOpen(true);}}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit' : 'Add New'} Category</DialogTitle>
                </DialogHeader>
                <CategoryForm category={editingCategory} onSave={handleFormSave} onCancel={handleFormCancel} />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length > 0 ? (
          <ul className="space-y-3">
            {categories.map((cat) => {
              // Look up the icon component from its string name
              const IconComponent = LucideIcons[cat.icon as keyof typeof LucideIcons] || Tag;
              return (
                <li key={cat.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/60 transition-colors">
                  <div className="flex items-center gap-3">
                    <IconComponent className="h-5 w-5" style={{color: cat.color}} />
                    <span className="font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)} aria-label="Edit Category">
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Delete Category">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </AlertTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will delete the category "{cat.name}". This action cannot be undone if the category is not in use.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteCategory(cat.id)} className="bg-destructive hover:bg-destructive/90">
                            Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-center py-4">No categories created yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
