export const nested_get = `
local call_in_chunks = function (command, args)
local step = 1000
local output = {}
for i = 1, #args, step do
    local result = redis.call(command, unpack(args, i, math.min(i + step - 1, #args)))
    for j = 1, #result do
        table.insert(output, result[j])
    end
end
return output
end
local ternary = function ( cond , T , F ) if cond then return T() else return F() end end
local map = function(func, array) local new_array = {} for i,v in ipairs(array) do new_array[i] = func(v) end return new_array end
local filter = function(fn, t) local out = {} for k, v in pairs(t) do if fn(k, v) then out[k] = v end end return out end
local function to_pairs(obj) 
    local keyset={}
    local n=0
    for k,v in pairs(obj) do
        n=n+2
        keyset[n-1]=k
        keyset[n]=v
    end
    return keyset
end
local concat_with_dot = function (a, b) if a == '' then return b end return a .. '.' .. b end
local prefix = function (str) return 'redibase_' .. str end

local function get_pairs(branch_keys, leaf_keys, output, options, current_layer) 
    local include_index_keys = options.include_index_keys
    local max_layers = options.max_layers
    
    while ((current_layer ~= max_layers) and not (#branch_keys == 0 and #leaf_keys == 0)) do
        local leaf_results = ternary(#leaf_keys > 0, 
            function () 
                return call_in_chunks('mget', map(prefix, leaf_keys)) 
            end, 
            function () 
                return {} 
            end)
        local branch_results = ternary(#branch_keys > 0, function () return map(function (bk) 
                    local prefixed = prefix(bk) 
                    return redis.call('hgetall', prefixed) 
                end, branch_keys) end, function () return {} end)
        local next_branch_keys = {}
        local next_leaf_keys = {}
        for i,branch_key in ipairs(branch_keys) do
            for j, val in ipairs(branch_results[i]) do
                if j % 2 == 1 then
                    local next_key = concat_with_dot(branch_key, val)
                    local next_key_type = branch_results[i][j+1]
                    if next_key_type == 'branch' then table.insert(next_branch_keys, next_key) end
                    if next_key_type == 'leaf' then table.insert(next_leaf_keys, next_key) end
                end
            end
        end
        local new_output = output
        if include_index_keys == 'true' then
            for i = 1, #branch_keys do
                new_output[branch_keys[i]] = branch_results[i]
            end
        end
        for i = 1, #leaf_keys do
            new_output[leaf_keys[i]] = leaf_results[i]
        end
        
        branch_keys = next_branch_keys
        leaf_keys = next_leaf_keys
        output = new_output
        current_layer = current_layer + 1
    end
    return output
end
local root_key = KEYS[1]
local root_key_type = redis.call('type', prefix(root_key)).ok
local branch_keys = {}
local leaf_keys = {}
if root_key_type == 'hash' then
    table.insert(branch_keys, root_key)
else
    table.insert(leaf_keys, root_key)
end
local x = get_pairs(branch_keys, leaf_keys, {}, { include_index_keys=KEYS[2], max_layers=KEYS[3] }, 0)
return to_pairs(x)

`
