import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, addDoc, query, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { DndContext, useDraggable, useDroppable, DragOverlay, rectIntersection } from '@dnd-kit/core';
import { TEAM_FORMATS, INITIAL_LINEUP } from '../utils/constants';
import { validateLineup } from '../utils/aysoRules';
import { UserMinus, UserPlus, AlertTriangle, X, GripVertical } from 'lucide-react';

function DraggableRosterPlayer({ player, isPlaying }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `roster-${player.id}`,
    data: { type: 'roster', playerId: player.id }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
  } : undefined;

  return (
    <div 
      ref={setNodeRef} style={style} {...listeners} {...attributes}
      className={`p-3 border rounded flex justify-between items-center transition-colors ${isPlaying ? 'bg-blue-50 border-blue-200' : 'bg-white shadow-sm'}`}
    >
      <div className="flex items-center">
        <GripVertical size={14} className="mr-2 text-gray-400 cursor-grab" />
        <span className="font-bold mr-2 text-sm">#{player.number}</span>
        <span className="text-sm">{player.name}</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [players, setPlayers] = useState([]);
  const [format, setFormat] = useState('10U');
  const [lineups, setLineups] = useState(INITIAL_LINEUP);
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [activeQuarter, setActiveQuarter] = useState('q1');
  const [activeDragId, setActiveDragId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, `coaches/${user.uid}/players`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [user.uid]);

  const addPlayer = async (e) => {
    e.preventDefault();
    if (!newName) return;
    await addDoc(collection(db, `coaches/${user.uid}/players`), {
      name: newName,
      number: newNumber,
      absent: false
    });
    setNewName('');
    setNewNumber('');
  };

  const toggleAbsent = async (player) => {
    await updateDoc(doc(db, `coaches/${user.uid}/players`, player.id), {
      absent: !player.absent
    });
  };

  const removeFromLineup = (playerId) => {
    setLineups(prev => {
      const currentQ = { ...prev[activeQuarter] };
      delete currentQ[playerId];
      return { ...prev, [activeQuarter]: currentQ };
    });
  };

  const handleDragStart = (event) => {
    setActiveDragId(event.active.id);
  };

  const handleDragEnd = (event) => {
    setActiveDragId(null);
    const { active, over } = event;
    const fieldElement = document.getElementById('soccer-field');
    const rect = fieldElement.getBoundingClientRect();
    const playerId = active.data.current?.playerId;
    if (!playerId) return;

    // 2. Calculate coordinates based on the center of the element's actual visual position
    const dropRect = active.rect.current.translated;
    if (!dropRect) return;

    const x = ((dropRect.left + dropRect.width / 2 - rect.left) / rect.width) * 100;
    const y = ((dropRect.top + dropRect.height / 2 - rect.top) / rect.height) * 100;

    setLineups(prev => {
      const currentQ = { ...prev[activeQuarter] };
      currentQ[playerId] = { 
        x: Number(Math.max(2, Math.min(98, x)).toFixed(2)), 
        y: Number(Math.max(2, Math.min(98, y)).toFixed(2)) 
      };
      return { ...prev, [activeQuarter]: currentQ };
    });
  };

  const errors = validateLineup(players.filter(p => !p.absent), lineups);
  const { setNodeRef: setFieldRef } = useDroppable({ id: 'soccer-field' });

  return (
    <DndContext
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
      collisionDetection={rectIntersection}
    >
      <div className="flex h-screen bg-gray-50">
      {/* Sidebar: Roster Management */}
      <div className="w-80 bg-white border-r p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Roster</h2>
          <button onClick={logout} className="text-xs text-red-500">Logout</button>
        </div>

        <form onSubmit={addPlayer} className="mb-6 space-y-2">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Name" className="w-full p-2 border rounded text-sm" />
          <input value={newNumber} onChange={e => setNewNumber(e.target.value)} placeholder="Number" className="w-full p-2 border rounded text-sm" />
          <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded text-sm flex items-center justify-center">
            <UserPlus size={16} className="mr-2"/> Add Player
          </button>
        </form>

        <div className="space-y-2">
          {players.map(player => (
            <div key={player.id} className="relative group">
              {!player.absent ? (
                <DraggableRosterPlayer player={player} isPlaying={player.id in lineups[activeQuarter]} />
              ) : (
                <div className="p-3 border rounded bg-gray-100 opacity-50 flex justify-between italic text-sm">
                  <span>#{player.number} {player.name}</span>
                </div>
              )}
              <button 
                onClick={() => toggleAbsent(player)} 
                className="absolute right-2 top-3 z-10 p-1 bg-white/80 rounded"
              >
                <UserMinus size={16} className={player.absent ? 'text-red-500' : 'text-gray-400'} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content: Field and Rules */}
      <div className="flex-1 p-8 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            {Object.keys(TEAM_FORMATS).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`px-4 py-2 rounded ${format === f ? 'bg-blue-600 text-white' : 'bg-white border'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex space-x-2">
            {['q1', 'q2', 'q3', 'q4'].map(q => (
              <button key={q} onClick={() => setActiveQuarter(q)} className={`px-6 py-2 rounded-full font-bold uppercase ${activeQuarter === q ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex gap-8">
          {/* Soccer Field View */}
          <div 
            id="soccer-field"
            ref={setFieldRef}
            className="flex-1 bg-green-700 rounded-3xl border-8 border-white/30 relative shadow-2xl overflow-hidden"
          >
            {/* Field Markings - Rendered FIRST to stay in the background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-4 border-white/20 rounded-full pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-20 border-b-4 border-x-4 border-white/20 pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-20 border-t-4 border-x-4 border-white/20 pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-white/20 -translate-x-1/2 pointer-events-none" />

            {/* Render players currently in this quarter's lineup */}
            {Object.entries(lineups[activeQuarter]).map(([pId, pos]) => {
              const player = players.find(p => p.id === pId);
              if (!player) return null;
              return (
                <FieldPlayer 
                  key={pId} 
                  player={player} 
                  pos={pos} 
                  isOverlay={false}
                  activeDragId={activeDragId}
                  onRemove={() => removeFromLineup(pId)} 
                />
              );
            })}
          </div>

          {/* Rules Validation Panel */}
          <div className="w-80">
            <h3 className="text-lg font-bold mb-4 flex items-center">
              <AlertTriangle className="mr-2 text-amber-500" /> AYSO Validation
            </h3>
            {errors.length > 0 ? (
              <ul className="space-y-2">
                {errors.map((err, i) => (
                  <li key={i} className="p-3 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                    {err}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4 bg-green-50 text-green-700 rounded border border-green-200 text-center font-bold">
                Lineup is Valid! ✅
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Drag Overlay: Shows the player following the mouse while dragging */}
      <DragOverlay>
        {activeDragId ? (
          <div className="w-12 h-12 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center font-bold shadow-2xl opacity-80 cursor-grabbing scale-110">
            {players.find(p => 
              `roster-${p.id}` === activeDragId || 
              `field-${p.id}` === activeDragId
            )?.number || '!'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function FieldPlayer({ player, pos, onRemove, activeDragId }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `field-${player.id}`,
    data: { type: 'field', playerId: player.id }
  });

  const style = {
    position: 'absolute',
    left: `${pos.x}%`,
    top: `${pos.y}%`,
    transform: transform 
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) translate(-50%, -50%)` 
      : 'translate(-50%, -50%)',
    zIndex: 50,
    // 关键修正：当有球员在被拖动时，场上其他球员不接收指针事件，防止阻挡球场落点判定
    pointerEvents: activeDragId ? 'none' : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} style={style}
      className={`group flex flex-col items-center ${activeDragId ? 'cursor-grabbing' : 'cursor-move'}`}
    >
      <div {...listeners} {...attributes} className="w-12 h-12 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center font-bold shadow-lg text-xs">
        {player.number}
      </div>
      <div className="bg-black/50 text-white text-[10px] px-2 py-0.5 rounded mt-1 whitespace-nowrap">
        {player.name}
      </div>
      <button 
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X size={10} />
      </button>
    </div>
  );
}