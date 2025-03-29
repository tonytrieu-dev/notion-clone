import React, { useState, useEffect } from "react";
import {
  getClasses,
  addClass,
  updateClass,
  deleteClass,
  getSettings,
  updateSettings,
} from "../services/dataService";
import { useAuth } from "../contexts/AuthContext";

const Sidebar = () => {
  const { isAuthenticated } = useAuth();
  const [title, setTitle] = useState("UCR");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [classes, setClasses] = useState([]);
  const [editingClassId, setEditingClassId] = useState(null);
  const [hoveredClassId, setHoveredClassId] = useState(null);
  const [newClassName, setNewClassName] = useState("");
  const [showSyllabusModal, setShowSyllabusModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isHoveringClassArea, setIsHoveringClassArea] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      // Load classes
      const fetchedClasses = await getClasses(isAuthenticated);
      setClasses(fetchedClasses);

      // Load settings
      const settings = getSettings();
      if (settings && settings.title) {
        setTitle(settings.title);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Title editing functions
  const handleTitleClick = () => {
    setIsEditingTitle(true);
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    // Save title in settings
    updateSettings({ title });
  };

  // Class editing functions
  const handleClassClick = (classId) => {
    const classObj = classes.find((c) => c.id === classId);
    setSelectedClass(classObj);
    setShowSyllabusModal(true);
  };

  const handleClassNameClick = (e, classId) => {
    e.stopPropagation();
    setEditingClassId(classId);
  };

  const handleClassChange = (e, classId) => {
    const updatedClasses = classes.map((c) =>
      c.id === classId ? { ...c, name: e.target.value } : c
    );
    setClasses(updatedClasses);
  };

  const handleClassBlur = async () => {
    // Save the updated class
    if (editingClassId) {
      const classToUpdate = classes.find((c) => c.id === editingClassId);
      if (classToUpdate) {
        await updateClass(editingClassId, classToUpdate, isAuthenticated);
      }
    }
    setEditingClassId(null);
  };

  const handleDeleteClass = async (e, classId) => {
    e.stopPropagation();
    await deleteClass(classId, isAuthenticated);
    setClasses(classes.filter((c) => c.id !== classId));
  };

  const handleAddClass = async () => {
    if (newClassName.trim()) {
      const newId = `class${Date.now()}`;
      const newClass = {
        id: newId,
        name: newClassName.trim(),
        syllabus: null,
      };

      // Add class to database/local storage
      const addedClass = await addClass(newClass, isAuthenticated);

      setClasses([...classes, addedClass]);
      setNewClassName("");
    } else {
      const newId = `class${Date.now()}`;
      const newClass = {
        id: newId,
        name: "New Class",
        syllabus: null,
      };

      // Add class to database/local storage
      const addedClass = await addClass(newClass, isAuthenticated);

      setClasses([...classes, addedClass]);
      setEditingClassId(newId);
    }
  };

  const handleClassKeyDown = (e, classId) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevents newline in input
      handleClassBlur(); // Close current editing
    }
  };

  // Syllabus handling functions
  const handleSyllabusUpload = async (e) => {
    const file = e.target.files[0];
    if (file && selectedClass) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const updatedClass = {
          ...selectedClass,
          syllabus: {
            name: file.name,
            type: file.type,
            size: file.size,
            data: event.target.result,
          },
        };

        // Update class in database/local storage
        await updateClass(selectedClass.id, updatedClass, isAuthenticated);

        const updatedClasses = classes.map((c) =>
          c.id === selectedClass.id ? updatedClass : c
        );
        setClasses(updatedClasses);

        // Update the selected class to show the uploaded syllabus
        setSelectedClass(updatedClass);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSyllabus = async () => {
    if (selectedClass) {
      const updatedClass = {
        ...selectedClass,
        syllabus: null,
      };

      // Update class in database/local storage
      await updateClass(selectedClass.id, updatedClass, isAuthenticated);

      const updatedClasses = classes.map((c) =>
        c.id === selectedClass.id ? updatedClass : c
      );
      setClasses(updatedClasses);
      setSelectedClass(updatedClass);
    }
  };

  // Syllabus Modal
  const renderSyllabusModal = () => {
    if (!showSyllabusModal || !selectedClass) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-10">
        <div className="bg-white p-5 rounded w-[600px] max-w-[90%] max-h-[90vh] overflow-auto">
          <h2 className="text-blue-600 mt-0 font-bold text-xl">
            {selectedClass.name}
          </h2>

          <div className="mb-5 mt-6">
            {/* Added mt-6 for more vertical spacing and fixed font-bold class */}
            <h3 className="font-bold text-lg mb-2">Upload syllabus</h3>
            {!selectedClass.syllabus ? (
              <div className="border-2 border-dashed border-gray-300 p-5 text-center mb-5">
                <p>
                  Drag and drop a syllabus file here, or click to select one
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleSyllabusUpload}
                  className="block mx-auto my-2.5"
                />
              </div>
            ) : (
              <div className="mb-5">
                <div className="flex justify-between items-center p-2.5 bg-gray-100 rounded mb-2.5">
                  <div>
                    <strong>Current Syllabus:</strong>{" "}
                    {selectedClass.syllabus.name}
                    <span className="ml-2.5 text-gray-500">
                      ({Math.round(selectedClass.syllabus.size / 1024)} KB)
                    </span>
                  </div>
                  <button
                    onClick={handleDeleteSyllabus}
                    className="bg-red-500 text-white border-none py-1 px-2.5 rounded cursor-pointer"
                  >
                    Remove
                  </button>
                </div>

                {selectedClass.syllabus.type === "application/pdf" && (
                  <embed
                    src={selectedClass.syllabus.data}
                    type="application/pdf"
                    className="w-full h-96 border border-gray-300"
                  />
                )}

                <p className="mt-4">
                  Upload a new syllabus to replace the current one:
                </p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleSyllabusUpload}
                  className="block my-2.5"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between mt-5">
            <button
              onClick={() => setShowSyllabusModal(false)}
              className="bg-gray-100 border border-gray-300 py-2 px-4 rounded cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={() => setShowSyllabusModal(false)}
              className="bg-blue-600 text-white border-none py-2 px-4 rounded cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-64 border-r border-gray-300 py-5 px-2.5 bg-white h-full box-border font-sans">
      {isEditingTitle ? (
        <input
          value={title}
          onChange={handleTitleChange}
          onBlur={handleTitleBlur}
          autoFocus
          className="text-4xl font-bold w-[90%] p-0.5 text-blue-700 border border-gray-300 mt-0 mb-6 font-inherit"
        />
      ) : (
        <h1
          className="text-blue-700 cursor-pointer text-5xl mb-6 leading-tight font-inherit font-semibold text-center"
          onClick={handleTitleClick}
        >
          {title}
        </h1>
      )}

      <div
        className="relative"
        onMouseEnter={() => setIsHoveringClassArea(true)}
        onMouseLeave={() => setIsHoveringClassArea(false)}
      >
        <div className="flex">
          {/* Changed from justify-between to no justification */}
          <h4 className="m-1 ml-8 text-amber-500 font-medium text-xl normal-case">
            Current Classes
          </h4>
        </div>

        <ul className="list-none p-0 pl-8 m-0">
          {/* Added pl-8 to align with the "C" in Current Classes */}
          {classes.map((cls) => (
            <li
              key={cls.id}
              className={`my-0.5 flex justify-start items-center p-0.5 pl-0 gap-1.5 cursor-pointer rounded ${
                hoveredClassId === cls.id ? "bg-gray-100" : "bg-transparent"
              }`}
              onMouseEnter={() => setHoveredClassId(cls.id)}
              onMouseLeave={() => setHoveredClassId(null)}
              onClick={() => handleClassClick(cls.id)}
            >
              {editingClassId === cls.id ? (
                <input
                  value={cls.name}
                  onChange={(e) => handleClassChange(e, cls.id)}
                  onKeyDown={(e) => handleClassKeyDown(e, cls.id)}
                  onBlur={handleClassBlur}
                  autoFocus
                  className="w-4/5 p-0.5"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="flex items-center pl-0 flex-1 relative">
                    <span className="mr-2 ml-0 text-blue-600 text-lg">•</span>
                    <span
                      onClick={(e) => handleClassNameClick(e, cls.id)}
                      className={`cursor-pointer ${
                        hoveredClassId === cls.id ? "font-bold" : "font-normal"
                      } transition-all duration-100`}
                    >
                      {cls.name}
                    </span>

                    {cls.syllabus && (
                      <span
                        className="ml-1 text-base text-blue-600"
                        title="Syllabus uploaded"
                      >
                        📄
                      </span>
                    )}
                  </div>
                  {hoveredClassId === cls.id && (
                    <button
                      onClick={(e) => handleDeleteClass(e, cls.id)}
                      className="bg-transparent border-none text-red-500 cursor-pointer text-base"
                    >
                      ×
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>

        {(classes.length === 0 || isHoveringClassArea) && (
          <button
            onClick={handleAddClass}
            className="flex items-center mt-2.5 p-0.5 pl-8 text-blue-600 hover:text-blue-800 cursor-pointer bg-transparent border-none"
          >
            <span className="mr-1 text-lg">+</span>
            <span>Add class</span>
          </button>
        )}
      </div>

      {renderSyllabusModal()}
    </div>
  );
};

export default Sidebar;
